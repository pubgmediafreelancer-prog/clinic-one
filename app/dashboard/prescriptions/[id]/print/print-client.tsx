"use client";

export default function PrintClient({ rx }: { rx: any }) {
  const items = rx.prescription_items ?? [];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 32, fontFamily: "var(--font-body, system-ui)", color: "#111" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .rx-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
        .rx-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .rx-table th, .rx-table td { border: 1px solid #999; padding: 8px 10px; text-align: right; font-size: 14px; }
        .rx-table th { background: #f2f2f2; }
        .rx-footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .rx-sig { border-top: 1px solid #333; width: 220px; text-align: center; padding-top: 6px; font-size: 13px; }
      `}</style>

      <button className="no-print primary" style={{ marginBottom: 20, width: "auto" }} onClick={() => window.print()}>
        🖨 طباعة / حفظ كـ PDF
      </button>

      <div className="rx-header">
        <div>
          <h2 style={{ margin: 0 }}>{rx.clinics?.name ?? "العيادة"}</h2>
          {rx.clinics?.phone && <div style={{ fontSize: 13 }}>هاتف: {rx.clinics.phone}</div>}
        </div>
        <div style={{ textAlign: "left", fontSize: 13 }}>
          <div>التاريخ: {new Date(rx.issued_at).toLocaleDateString("ar-LB")}</div>
          <div>الطبيب: د. {rx.profiles?.full_name ?? "—"}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, fontSize: 14 }}>
        <strong>المريض:</strong> {rx.patients?.full_name ?? "—"}
        {rx.patients?.date_of_birth && <span> — تاريخ الميلاد: {new Date(rx.patients.date_of_birth).toLocaleDateString("ar-LB")}</span>}
      </div>

      <h3 style={{ marginBottom: 4 }}>℞ الوصفة الطبية</h3>
      <table className="rx-table">
        <thead>
          <tr>
            <th>الدواء</th>
            <th>الجرعة</th>
            <th>التكرار</th>
            <th>المدة</th>
            <th>تعليمات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id}>
              <td>{it.drugs?.name ? `${it.drugs.name}${it.drugs.strength ? " " + it.drugs.strength : ""}` : it.drug_name_free_text}</td>
              <td>{it.dosage}</td>
              <td>{it.frequency}</td>
              <td>{it.duration}</td>
              <td>{it.instructions ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {rx.notes && (
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <strong>ملاحظات:</strong> {rx.notes}
        </div>
      )}

      <div className="rx-footer">
        <div />
        <div className="rx-sig">توقيع وختم الطبيب</div>
      </div>
    </div>
  );
}
