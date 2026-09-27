"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INVOICE_STATUS_LABEL: Record<string, string> = {
  unpaid: "غير مدفوعة", partial: "مدفوعة جزئياً", paid: "مدفوعة",
};
const INVOICE_STATUS_CLASS: Record<string, string> = {
  unpaid: "badge-danger", partial: "badge-warn", paid: "badge-success",
};
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "نقدي", whish_money: "Whish Money", bank_transfer: "حوالة مصرفية", installment: "تقسيط",
};
const CURRENCY_LABEL: Record<string, string> = { USD: "$", LBP: "ل.ل" };

function fmtMoney(amount: number, currency: string) {
  const n = Number(amount) || 0;
  return currency === "LBP" ? `${n.toLocaleString("en-US")} ${CURRENCY_LABEL.LBP}` : `${CURRENCY_LABEL.USD}${n.toFixed(2)}`;
}

export default function PatientFileClient({
  profile, clinic, patient, visits, reports, invoices, payments,
}: { profile: any; clinic: any; patient: any; visits: any[]; reports: any[]; invoices: any[]; payments: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const exchangeRate = Number(clinic?.exchange_rate) || 89000;

  const [visitForm, setVisitForm] = useState({ diagnosis: "", notes: "" });
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitLoading, setVisitLoading] = useState(false);

  const [reportForm, setReportForm] = useState({ title: "", sharedWithPatient: true });
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({ amount: "", currency: "USD" });
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
  const [payCurrency, setPayCurrency] = useState<Record<string, string>>({});
  const [payMethod, setPayMethod] = useState<Record<string, string>>({});
  const [invoiceBusyId, setInvoiceBusyId] = useState<string | null>(null);
  const [payError, setPayError] = useState<Record<string, string>>({});

  const isDoctor = profile.role === "doctor";
  const isStaff = profile.role === "admin" || profile.role === "secretary" || isDoctor;

  async function addVisit(e: React.FormEvent) {
    e.preventDefault();
    setVisitError(null);
    setVisitLoading(true);
    const { error } = await supabase.from("visits").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      doctor_id: profile.role === "doctor" ? profile.id : null,
      diagnosis: visitForm.diagnosis || null,
      notes: visitForm.notes || null,
      visited_at: new Date().toISOString(),
    });
    setVisitLoading(false);
    if (error) { setVisitError(error.message); return; }
    setVisitForm({ diagnosis: "", notes: "" });
    router.refresh();
  }

  async function addReport(e: React.FormEvent) {
    e.preventDefault();
    setReportError(null);
    setReportLoading(true);
    const { error } = await supabase.from("reports").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      title: reportForm.title,
      shared_with_patient: reportForm.sharedWithPatient,
    });
    setReportLoading(false);
    if (error) { setReportError(error.message); return; }
    setReportForm({ title: "", sharedWithPatient: true });
    router.refresh();
  }

  async function addInvoice(e: React.FormEvent) {
    e.preventDefault();
    setInvoiceError(null);
    setInvoiceLoading(true);
    const amount = Number(invoiceForm.amount);
    const currency = invoiceForm.currency;
    const amountUsdEquiv = currency === "LBP" ? amount / exchangeRate : amount;
    const { error } = await supabase.from("invoices").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      amount,
      paid_amount: 0,
      status: "unpaid",
      currency,
      amount_usd_equiv: amountUsdEquiv,
      exchange_rate_used: exchangeRate,
    });
    setInvoiceLoading(false);
    if (error) { setInvoiceError(error.message); return; }
    setInvoiceForm({ amount: "", currency: "USD" });
    router.refresh();
  }

  function convertToInvoiceCurrency(amount: number, fromCurrency: string, invoiceCurrency: string) {
    if (fromCurrency === invoiceCurrency) return amount;
    if (fromCurrency === "USD" && invoiceCurrency === "LBP") return amount * exchangeRate;
    if (fromCurrency === "LBP" && invoiceCurrency === "USD") return amount / exchangeRate;
    return amount;
  }

  async function recordPayment(inv: any) {
    const raw = payAmount[inv.id];
    const amt = Number(raw);
    const currency = payCurrency[inv.id] ?? inv.currency ?? "USD";
    const method = payMethod[inv.id] ?? "cash";
    setPayError({ ...payError, [inv.id]: "" });
    if (!raw || isNaN(amt) || amt <= 0) {
      setPayError({ ...payError, [inv.id]: "أدخل مبلغ صحيح" });
      return;
    }
    setInvoiceBusyId(inv.id);
    const total = Number(inv.amount);
    const invoiceCurrency = inv.currency ?? "USD";
    const amtInInvoiceCurrency = convertToInvoiceCurrency(amt, currency, invoiceCurrency);
    const newPaid = Math.min(Number(inv.paid_amount) + amtInInvoiceCurrency, total);
    const newStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";

    const { error: payErr } = await supabase.from("payments").insert({
      invoice_id: inv.id,
      clinic_id: profile.clinic_id,
      amount: amt,
      currency,
      method,
      exchange_rate_used: exchangeRate,
    });
    if (payErr) { setInvoiceBusyId(null); setPayError({ ...payError, [inv.id]: payErr.message }); return; }

    const { error } = await supabase
      .from("invoices")
      .update({ paid_amount: newPaid, status: newStatus })
      .eq("id", inv.id);
    setInvoiceBusyId(null);
    if (error) { setPayError({ ...payError, [inv.id]: error.message }); return; }
    setPayAmount({ ...payAmount, [inv.id]: "" });
    router.refresh();
  }

  async function deleteInvoice(id: string) {
    if (!confirm("حذف هذه الفاتورة؟")) return;
    setInvoiceBusyId(id);
    await supabase.from("invoices").delete().eq("id", id);
    setInvoiceBusyId(null);
    router.refresh();
  }

  const totalDueUsd = invoices.reduce((s, i) => {
    const remaining = Number(i.amount) - Number(i.paid_amount);
    const remainingUsd = i.currency === "LBP" ? remaining / (Number(i.exchange_rate_used) || exchangeRate) : remaining;
    return s + remainingUsd;
  }, 0);
  const paymentsByInvoice: Record<string, any[]> = {};
  for (const p of payments) {
    (paymentsByInvoice[p.invoice_id] ??= []).push(p);
  }

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 780 }}>
        <div className="row page-head">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", flexShrink: 0,
            }}>
              {patient.full_name?.trim()?.[0] ?? "؟"}
            </div>
            <div>
              <h1 style={{ marginBottom: 2 }}>{patient.full_name}</h1>
              <p className="subtitle" style={{ margin: 0 }}>
                {patient.phone}
                {patient.blood_type ? ` — فصيلة الدم: ${patient.blood_type}` : ""}
              </p>
              {patient.allergies && (
                <span className="badge badge-warn" style={{ marginTop: 6, display: "inline-block" }}>
                  ⚠ حساسية: {patient.allergies}
                </span>
              )}
            </div>
          </div>
          <a href="/dashboard" className="link">→ رجوع للداشبورد</a>
        </div>

        {totalDueUsd > 0 && (profile.role === "admin" || profile.role === "secretary") && (
          <div className="stat-grid" style={{ marginBottom: "var(--space-5)" }}>
            <div className="stat-card">
              <div className="stat-label">مبلغ مستحق على المريض (تقريبي بالدولار)</div>
              <div className="stat-value" style={{ color: "var(--danger)" }}>${totalDueUsd.toFixed(2)}</div>
              <div className="subtitle" style={{ margin: 0 }}>سعر الصرف: {exchangeRate.toLocaleString("en-US")} ل.ل/$</div>
            </div>
          </div>
        )}

        {isStaff && (
          <div className="card mb-5">
            <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة زيارة</h2>
            <form onSubmit={addVisit}>
              <div className="grid-2">
                <div>
                  <label>التشخيص</label>
                  <input value={visitForm.diagnosis} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} />
                </div>
                <div>
                  <label>ملاحظات</label>
                  <input value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
                </div>
              </div>
              {visitError && <p className="error">{visitError}</p>}
              <button className="primary" disabled={visitLoading}>{visitLoading ? "..." : "حفظ الزيارة"}</button>
            </form>
          </div>
        )}

        <div className="card mb-5">
          <h2 className="section-title" style={{ marginBottom: 8 }}>الزيارات</h2>
          {visits.length === 0 && <div className="empty-state">لا يوجد زيارات بعد</div>}
          {visits.map((v) => (
            <div key={v.id} className="list-item">
              <div className="subtitle" style={{ margin: 0 }}>
                {new Date(v.visited_at).toLocaleString("ar-LB")} — د. {v.profiles?.full_name ?? "—"}
              </div>
              {v.diagnosis && <div style={{ fontWeight: 600 }}>{v.diagnosis}</div>}
              {v.notes && <div className="subtitle" style={{ margin: 0 }}>{v.notes}</div>}
            </div>
          ))}
        </div>

        {isStaff && (
          <div className="card mb-5">
            <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة تقرير</h2>
            <form onSubmit={addReport}>
              <label>عنوان التقرير</label>
              <input required value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={reportForm.sharedWithPatient}
                  onChange={(e) => setReportForm({ ...reportForm, sharedWithPatient: e.target.checked })}
                />
                مشاركة التقرير مع المريض ببوابته
              </label>
              {reportError && <p className="error">{reportError}</p>}
              <button className="primary" disabled={reportLoading}>{reportLoading ? "..." : "حفظ التقرير"}</button>
            </form>
          </div>
        )}

        <div className="card mb-5">
          <h2 className="section-title" style={{ marginBottom: 8 }}>التقارير</h2>
          {reports.length === 0 && <div className="empty-state">لا يوجد تقارير بعد</div>}
          {reports.map((r) => (
            <div key={r.id} className="row list-item">
              <div style={{ fontWeight: 600 }}>{r.title}</div>
              <span className={`badge ${r.shared_with_patient ? "badge-success" : "badge-muted"}`}>
                {r.shared_with_patient ? "مشارك مع المريض" : "داخلي"}
              </span>
            </div>
          ))}
        </div>

        {(profile.role === "admin" || profile.role === "secretary") && (
          <div className="card mb-5">
            <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة فاتورة</h2>
            <form onSubmit={addInvoice}>
              <div className="grid-2">
                <div>
                  <label>المبلغ</label>
                  <input required type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
                </div>
                <div>
                  <label>العملة</label>
                  <select value={invoiceForm.currency} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}>
                    <option value="USD">دولار أمريكي ($)</option>
                    <option value="LBP">ليرة لبنانية (ل.ل)</option>
                  </select>
                </div>
              </div>
              {invoiceForm.currency === "LBP" && invoiceForm.amount && (
                <p className="subtitle" style={{ marginTop: 4 }}>
                  ≈ ${(Number(invoiceForm.amount) / exchangeRate).toFixed(2)} بسعر صرف {exchangeRate.toLocaleString("en-US")}
                </p>
              )}
              {invoiceError && <p className="error">{invoiceError}</p>}
              <button className="primary" disabled={invoiceLoading}>{invoiceLoading ? "..." : "إضافة فاتورة"}</button>
            </form>
          </div>
        )}

        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 8 }}>الفواتير</h2>
          {invoices.length === 0 && <div className="empty-state">لا يوجد فواتير بعد</div>}
          {invoices.map((i) => {
            const invCurrency = i.currency ?? "USD";
            const invPayments = paymentsByInvoice[i.id] ?? [];
            return (
            <div key={i.id} className="list-item">
              <div className="row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontWeight: 600 }}>
                  {fmtMoney(i.amount, invCurrency)} <span className="subtitle" style={{ margin: 0, fontWeight: 400 }}>— مدفوع {fmtMoney(i.paid_amount, invCurrency)}</span>
                  {invCurrency === "LBP" && (
                    <span className="subtitle" style={{ margin: 0, fontWeight: 400 }}> (≈ ${Number(i.amount_usd_equiv ?? 0).toFixed(2)})</span>
                  )}
                </div>
                <span className={`badge ${INVOICE_STATUS_CLASS[i.status] ?? ""}`}>{INVOICE_STATUS_LABEL[i.status] ?? i.status}</span>
                {(profile.role === "admin" || profile.role === "secretary") && (
                  <button
                    onClick={() => deleteInvoice(i.id)}
                    disabled={invoiceBusyId === i.id}
                    className="btn-danger-sm"
                  >
                    حذف
                  </button>
                )}
              </div>

              {invPayments.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {invPayments.map((p) => (
                    <div key={p.id} className="subtitle" style={{ margin: 0 }}>
                      {fmtMoney(p.amount, p.currency)} — {PAYMENT_METHOD_LABEL[p.method] ?? p.method} — {new Date(p.paid_at).toLocaleDateString("ar-LB")}
                    </div>
                  ))}
                </div>
              )}

              {(profile.role === "admin" || profile.role === "secretary") && i.status !== "paid" && (
                <div style={{ marginTop: 8 }}>
                  <div className="row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="مبلغ الدفعة"
                      value={payAmount[i.id] ?? ""}
                      onChange={(e) => setPayAmount({ ...payAmount, [i.id]: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <select
                      value={payCurrency[i.id] ?? invCurrency}
                      onChange={(e) => setPayCurrency({ ...payCurrency, [i.id]: e.target.value })}
                      style={{ width: "auto" }}
                    >
                      <option value="USD">$</option>
                      <option value="LBP">ل.ل</option>
                    </select>
                    <select
                      value={payMethod[i.id] ?? "cash"}
                      onChange={(e) => setPayMethod({ ...payMethod, [i.id]: e.target.value })}
                      style={{ width: "auto" }}
                    >
                      <option value="cash">نقدي</option>
                      <option value="whish_money">Whish Money</option>
                      <option value="bank_transfer">حوالة مصرفية</option>
                      <option value="installment">تقسيط</option>
                    </select>
                    <button
                      onClick={() => recordPayment(i)}
                      disabled={invoiceBusyId === i.id}
                      className="primary"
                      style={{ width: "auto", marginTop: 0, whiteSpace: "nowrap" }}
                    >
                      {invoiceBusyId === i.id ? "..." : "تسجيل دفعة"}
                    </button>
                  </div>
                </div>
              )}
              {payError[i.id] && <p className="error" style={{ marginTop: 4 }}>{payError[i.id]}</p>}
            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
