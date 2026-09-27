"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INVOICE_LABEL: Record<string, string> = { unpaid: "غير مدفوعة", partial: "دفعة جزئية", paid: "مدفوعة" };
const INVOICE_CLASS: Record<string, string> = { unpaid: "badge-danger", partial: "badge-warn", paid: "badge-success" };

export default function RecordsClient({ patients, reports, invoices }: { patients: any[]; reports: any[]; invoices: any[] }) {
  const router = useRouter();
  const supabase = createClient();

  async function downloadReport(filePath: string, title: string) {
    const { data, error } = await supabase.storage.from("reports").createSignedUrl(filePath, 60);
    if (error || !data) { alert("تعذر تحميل الملف"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/portal");
  }

  const clinicName = (patientId: string) =>
    patients.find((p) => p.id === patientId)?.clinics?.name ?? "";

  return (
    <main className="page" style={{ maxWidth: 560 }}>
      <div className="row page-head">
        <div>
          <div className="eyebrow">بوابة المريض</div>
          <h1 style={{ margin: 0 }}>ملفي الطبي</h1>
        </div>
        <button onClick={signOut} className="link" style={{ background: "none", border: "none", cursor: "pointer" }}>خروج</button>
      </div>

      {patients.length === 0 && (
        <div className="card"><div className="empty-state">لم يتم ربط رقمك بأي ملف مريض بعد. تواصل مع العيادة.</div></div>
      )}

      {patients.map((p) => (
        <div key={p.id} className="card mb-5" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, flexShrink: 0,
          }}>
            {p.full_name?.trim()?.[0] ?? "؟"}
          </div>
          <div>
            <p className="subtitle" style={{ margin: 0 }}>{p.clinics?.name}</p>
            <h2 className="section-title">{p.full_name}</h2>
          </div>
        </div>
      ))}

      <div className="card mb-5">
        <h2 className="section-title" style={{ marginBottom: 8 }}>التقارير والفحوصات</h2>
        {reports.length === 0 && <div className="empty-state">لا يوجد تقارير مشتركة بعد</div>}
        {reports.map((r) => (
          <div key={r.id} className="list-item row">
            <div>
              <div style={{ fontWeight: 600 }}>{r.title}</div>
              <div className="subtitle" style={{ margin: 0 }}>{clinicName(r.patient_id)}</div>
            </div>
            <button className="btn-sm" onClick={() => downloadReport(r.file_path, r.title)}>
              تنزيل
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginBottom: 8 }}>الفواتير</h2>
        {invoices.length === 0 && <div className="empty-state">لا يوجد فواتير</div>}
        {invoices.map((inv) => (
          <div key={inv.id} className="list-item row">
            <div style={{ fontWeight: 600 }}>{inv.amount} $ <span className="subtitle" style={{ fontWeight: 400 }}>— {clinicName(inv.patient_id)}</span></div>
            <span className={`badge ${INVOICE_CLASS[inv.status] ?? ""}`}>{INVOICE_LABEL[inv.status] ?? inv.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
