"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INVOICE_LABEL: Record<string, string> = { unpaid: "غير مدفوعة", partial: "دفعة جزئية", paid: "مدفوعة" };

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
      <div className="row">
        <h1>ملفي الطبي</h1>
        <button onClick={signOut} className="link" style={{ background: "none", border: "none", cursor: "pointer" }}>خروج</button>
      </div>

      {patients.length === 0 && (
        <div className="card"><p className="subtitle">لم يتم ربط رقمك بأي ملف مريض بعد. تواصل مع العيادة.</p></div>
      )}

      {patients.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 16 }}>
          <p className="subtitle" style={{ margin: 0 }}>{p.clinics?.name}</p>
          <h1 style={{ fontSize: "1.1rem" }}>{p.full_name}</h1>
        </div>
      ))}

      <div className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: "1.1rem" }}>التقارير والفحوصات</h1>
        {reports.length === 0 && <p className="subtitle">لا يوجد تقارير مشتركة بعد</p>}
        {reports.map((r) => (
          <div key={r.id} className="list-item row">
            <div>
              <div>{r.title}</div>
              <div className="subtitle" style={{ margin: 0 }}>{clinicName(r.patient_id)}</div>
            </div>
            <button className="link" style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
              onClick={() => downloadReport(r.file_path, r.title)}>
              تنزيل
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.1rem" }}>الفواتير</h1>
        {invoices.length === 0 && <p className="subtitle">لا يوجد فواتير</p>}
        {invoices.map((inv) => (
          <div key={inv.id} className="list-item row">
            <div>{inv.amount} $ — {clinicName(inv.patient_id)}</div>
            <span className="badge">{INVOICE_LABEL[inv.status] ?? inv.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
