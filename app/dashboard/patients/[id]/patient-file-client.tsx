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

export default function PatientFileClient({
  profile, patient, visits, reports, invoices,
}: { profile: any; patient: any; visits: any[]; reports: any[]; invoices: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [visitForm, setVisitForm] = useState({ diagnosis: "", notes: "" });
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitLoading, setVisitLoading] = useState(false);

  const [reportForm, setReportForm] = useState({ title: "", sharedWithPatient: true });
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [invoiceForm, setInvoiceForm] = useState({ amount: "" });
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [payAmount, setPayAmount] = useState<Record<string, string>>({});
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
    const { error } = await supabase.from("invoices").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      amount: Number(invoiceForm.amount),
      paid_amount: 0,
      status: "unpaid",
    });
    setInvoiceLoading(false);
    if (error) { setInvoiceError(error.message); return; }
    setInvoiceForm({ amount: "" });
    router.refresh();
  }

  async function recordPayment(inv: any) {
    const raw = payAmount[inv.id];
    const amt = Number(raw);
    setPayError({ ...payError, [inv.id]: "" });
    if (!raw || isNaN(amt) || amt <= 0) {
      setPayError({ ...payError, [inv.id]: "أدخل مبلغ صحيح" });
      return;
    }
    setInvoiceBusyId(inv.id);
    const total = Number(inv.amount);
    const newPaid = Math.min(Number(inv.paid_amount) + amt, total);
    const newStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
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

  const totalDue = invoices.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0);

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

        {totalDue > 0 && (profile.role === "admin" || profile.role === "secretary") && (
          <div className="stat-grid" style={{ marginBottom: "var(--space-5)" }}>
            <div className="stat-card">
              <div className="stat-label">مبلغ مستحق على المريض</div>
              <div className="stat-value" style={{ color: "var(--danger)" }}>${totalDue.toFixed(2)}</div>
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
              <label>المبلغ ($)</label>
              <input required type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
              {invoiceError && <p className="error">{invoiceError}</p>}
              <button className="primary" disabled={invoiceLoading}>{invoiceLoading ? "..." : "إضافة فاتورة"}</button>
            </form>
          </div>
        )}

        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 8 }}>الفواتير</h2>
          {invoices.length === 0 && <div className="empty-state">لا يوجد فواتير بعد</div>}
          {invoices.map((i) => (
            <div key={i.id} className="list-item">
              <div className="row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontWeight: 600 }}>
                  ${Number(i.amount).toFixed(2)} <span className="subtitle" style={{ margin: 0, fontWeight: 400 }}>— مدفوع ${Number(i.paid_amount).toFixed(2)}</span>
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
              {(profile.role === "admin" || profile.role === "secretary") && i.status !== "paid" && (
                <div className="row" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="مبلغ الدفعة"
                    value={payAmount[i.id] ?? ""}
                    onChange={(e) => setPayAmount({ ...payAmount, [i.id]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => recordPayment(i)}
                    disabled={invoiceBusyId === i.id}
                    className="primary"
                    style={{ width: "auto", marginTop: 0, whiteSpace: "nowrap" }}
                  >
                    {invoiceBusyId === i.id ? "..." : "تسجيل دفعة"}
                  </button>
                </div>
              )}
              {payError[i.id] && <p className="error" style={{ marginTop: 4 }}>{payError[i.id]}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
