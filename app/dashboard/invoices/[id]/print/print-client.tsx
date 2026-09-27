"use client";

const CURRENCY_LABEL: Record<string, string> = { USD: "$", LBP: "ل.ل" };
function fmt(amount: number, currency: string) {
  const n = Number(amount) || 0;
  return currency === "LBP" ? `${n.toLocaleString("en-US")} ${CURRENCY_LABEL.LBP}` : `${CURRENCY_LABEL.USD}${n.toFixed(2)}`;
}

export default function PrintClient({ invoice }: { invoice: any }) {
  const items = invoice.invoice_items ?? [];
  const currency = invoice.currency ?? "USD";
  const subtotal = items.length > 0
    ? items.reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.unit_price), 0)
    : Number(invoice.amount) + Number(invoice.discount ?? 0);
  const discount = Number(invoice.discount ?? 0);
  const taxPercent = Number(invoice.tax_percent ?? 0);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxPercent / 100);
  const total = afterDiscount + tax;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 32, fontFamily: "var(--font-body, system-ui)", color: "#111" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
        .inv-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .inv-table th, .inv-table td { border: 1px solid #999; padding: 8px 10px; text-align: right; font-size: 14px; }
        .inv-table th { background: #f2f2f2; }
        .inv-totals { margin-top: 16px; margin-inline-start: auto; width: 280px; font-size: 14px; }
        .inv-totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
        .inv-totals .grand { border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; font-weight: 800; font-size: 16px; }
      `}</style>

      <button className="no-print primary" style={{ marginBottom: 20, width: "auto" }} onClick={() => window.print()}>
        🖨 طباعة / حفظ كـ PDF
      </button>

      <div className="inv-header">
        <div>
          <h2 style={{ margin: 0 }}>{invoice.clinics?.name ?? "العيادة"}</h2>
          {invoice.clinics?.phone && <div style={{ fontSize: 13 }}>هاتف: {invoice.clinics.phone}</div>}
        </div>
        <div style={{ textAlign: "left", fontSize: 13 }}>
          <div>التاريخ: {new Date(invoice.created_at).toLocaleDateString("ar-LB")}</div>
          <div>فاتورة رقم: {invoice.id.slice(0, 8)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, fontSize: 14 }}>
        <strong>المريض:</strong> {invoice.patients?.full_name ?? "—"}
        {invoice.patients?.phone && <span> — {invoice.patients.phone}</span>}
      </div>

      <h3 style={{ marginBottom: 4 }}>الفاتورة</h3>
      {items.length > 0 ? (
        <table className="inv-table">
          <thead>
            <tr>
              <th>الوصف</th>
              <th>الكمية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td>{it.quantity}</td>
                <td>{fmt(it.unit_price, currency)}</td>
                <td>{fmt(Number(it.quantity) * Number(it.unit_price), currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 14 }}>مبلغ الفاتورة: {fmt(invoice.amount, currency)}</div>
      )}

      <div className="inv-totals">
        <div className="row"><span>المجموع الفرعي</span><span>{fmt(subtotal, currency)}</span></div>
        {discount > 0 && <div className="row"><span>الخصم</span><span>-{fmt(discount, currency)}</span></div>}
        {taxPercent > 0 && <div className="row"><span>الضريبة ({taxPercent}%)</span><span>{fmt(tax, currency)}</span></div>}
        <div className="row grand"><span>الإجمالي</span><span>{fmt(total, currency)}</span></div>
        <div className="row"><span>المدفوع</span><span>{fmt(invoice.paid_amount, currency)}</span></div>
        <div className="row"><span>المتبقي</span><span>{fmt(Number(invoice.amount) - Number(invoice.paid_amount), currency)}</span></div>
      </div>
    </div>
  );
}
