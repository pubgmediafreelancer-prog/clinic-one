"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INVOICE_STATUS_LABEL: Record<string, string> = {
  unpaid: "غير مدفوعة", partial: "مدفوعة جزئياً", paid: "مدفوعة",
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

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="row">
        <div>
          <h1>{patient.full_name}</h1>
          <p className="subtitle">
            {patient.phone}
            {patient.blood_type ? ` — فصيلة الدم: ${patient.blood_type}` : ""}
          </p>
        </div>
        <a href="/dashboard" className="link">رجوع للداشبورد</a>
      </div>

      {patient.allergies && (
        <p className="subtitle" style={{ marginTop: -12 }}>حساسية: {patient.allergies}</p>
      )}

      {isStaff && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.1rem" }}>إضافة زيارة</h1>
          <form onSubmit={addVisit}>
            <label>التشخيص</label>
            <input value={visitForm.diagnosis} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} />
            <label>ملاحظات</label>
            <input value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
            {visitError && <p className="error">{visitError}</p>}
            <button className="primary" disabled={visitLoading}>{visitLoading ? "..." : "حفظ الزيارة"}</button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.1rem" }}>الزيارات</h1>
        {visits.length === 0 && <p className="subtitle">لا يوجد زيارات بعد</p>}
        {visits.map((v) => (
          <div key={v.id} className="list-item">
            <div className="subtitle" style={{ margin: 0 }}>
              {new Date(v.visited_at).toLocaleString("ar-LB")} — د. {v.profiles?.full_name ?? "—"}
            </div>
            {v.diagnosis && <div>{v.diagnosis}</div>}
            {v.notes && <div className="subtitle" style={{ margin: 0 }}>{v.notes}</div>}
          </div>
        ))}
      </div>

      {isStaff && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.1rem" }}>إضافة تقرير</h1>
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

      <div className="card" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.1rem" }}>التقارير</h1>
        {reports.length === 0 && <p className="subtitle">لا يوجد تقارير بعد</p>}
        {reports.map((r) => (
          <div key={r.id} className="row list-item">
            <div>{r.title}</div>
            <span className="badge">{r.shared_with_patient ? "مشارك مع المريض" : "داخلي"}</span>
          </div>
        ))}
      </div>

      {(profile.role === "admin" || profile.role === "secretary") && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.1rem" }}>إضافة فاتورة</h1>
          <form onSubmit={addInvoice}>
            <label>المبلغ ($)</label>
            <input required type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} />
            {invoiceError && <p className="error">{invoiceError}</p>}
            <button className="primary" disabled={invoiceLoading}>{invoiceLoading ? "..." : "إضافة فاتورة"}</button>
          </form>
        </div>
      )}

      <div className="card">
        <h1 style={{ fontSize: "1.1rem" }}>الفواتير</h1>
        {invoices.length === 0 && <p className="subtitle">لا يوجد فواتير بعد</p>}
        {invoices.map((i) => (
          <div key={i.id} className="row list-item">
            <div>${Number(i.amount).toFixed(2)}</div>
            <span className="badge">{INVOICE_STATUS_LABEL[i.status] ?? i.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
