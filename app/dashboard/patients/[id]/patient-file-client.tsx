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
const GENDER_LABEL: Record<string, string> = { male: "ذكر", female: "أنثى" };

function fmtMoney(amount: number, currency: string) {
  const n = Number(amount) || 0;
  return currency === "LBP" ? `${n.toLocaleString("en-US")} ${CURRENCY_LABEL.LBP}` : `${CURRENCY_LABEL.USD}${n.toFixed(2)}`;
}

const TABS = [
  { key: "overview", label: "نظرة عامة" },
  { key: "visits", label: "الزيارات" },
  { key: "history", label: "التاريخ الطبي" },
  { key: "prescriptions", label: "الوصفات" },
  { key: "documents", label: "المستندات" },
  { key: "billing", label: "الفوترة" },
] as const;
type TabKey = typeof TABS[number]["key"];

const EMPTY_VISIT_FORM = {
  reasonForVisit: "",
  chiefComplaint: "",
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  oxygenSaturation: "",
  weight: "",
  height: "",
  examination: "",
  diagnosis: "",
  treatmentPlan: "",
  notes: "",
  followUpDate: "",
};

export default function PatientFileClient({
  profile, clinic, patient, doctors, visits, reports, invoices, payments, prescriptions,
}: {
  profile: any; clinic: any; patient: any; doctors: any[]; visits: any[]; reports: any[];
  invoices: any[]; payments: any[]; prescriptions: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const exchangeRate = Number(clinic?.exchange_rate) || 89000;

  const [tab, setTab] = useState<TabKey>("overview");

  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [rxItems, setRxItems] = useState<{ drugId: string | null; name: string; dosage: string; frequency: string; duration: string; instructions: string }[]>([]);
  const [rxNotes, setRxNotes] = useState("");
  const [rxError, setRxError] = useState<string | null>(null);
  const [rxLoading, setRxLoading] = useState(false);

  async function searchDrugs(q: string) {
    setDrugQuery(q);
    if (!q.trim()) { setDrugResults([]); return; }
    const { data } = await supabase.from("drugs").select("id, name, generic_name, strength").ilike("name", `%${q}%`).limit(8);
    setDrugResults(data ?? []);
  }

  function addRxItem(drug?: any) {
    setRxItems([...rxItems, {
      drugId: drug?.id ?? null,
      name: drug ? `${drug.name}${drug.strength ? " " + drug.strength : ""}` : drugQuery,
      dosage: "", frequency: "", duration: "", instructions: "",
    }]);
    setDrugQuery("");
    setDrugResults([]);
  }

  function updateRxItem(idx: number, field: string, value: string) {
    const next = [...rxItems];
    (next[idx] as any)[field] = value;
    setRxItems(next);
  }

  function removeRxItem(idx: number) {
    setRxItems(rxItems.filter((_, i) => i !== idx));
  }

  async function savePrescription(e: React.FormEvent) {
    e.preventDefault();
    setRxError(null);
    if (rxItems.length === 0) { setRxError("أضف دواء واحد على الأقل"); return; }
    setRxLoading(true);
    const { data: rx, error } = await supabase.from("prescriptions").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      doctor_id: profile.id,
      notes: rxNotes || null,
    }).select("id").single();
    if (error || !rx) { setRxLoading(false); setRxError(error?.message ?? "خطأ"); return; }
    const { error: itemsError } = await supabase.from("prescription_items").insert(
      rxItems.map((it) => ({
        prescription_id: rx.id,
        drug_id: it.drugId,
        drug_name_free_text: it.drugId ? null : it.name,
        dosage: it.dosage || "-",
        frequency: it.frequency || "-",
        duration: it.duration || "-",
        instructions: it.instructions || null,
      }))
    );
    setRxLoading(false);
    if (itemsError) { setRxError(itemsError.message); return; }
    setRxItems([]);
    setRxNotes("");
    router.refresh();
  }

  const [visitForm, setVisitForm] = useState({ ...EMPTY_VISIT_FORM });
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitLoading, setVisitLoading] = useState(false);
  const [showNewVisit, setShowNewVisit] = useState(false);

  const [profileForm, setProfileForm] = useState({
    gender: patient.gender ?? "",
    address: patient.address ?? "",
    fileNumber: patient.file_number ?? "",
    assignedDoctorId: patient.assigned_doctor_id ?? "",
    allergies: patient.allergies ?? "",
    chronicConditions: patient.chronic_conditions ?? "",
    currentMedications: patient.current_medications ?? "",
    notes: patient.notes ?? "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

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
  const isFrontDesk = profile.role === "admin" || profile.role === "secretary";

  async function addVisit(e: React.FormEvent) {
    e.preventDefault();
    setVisitError(null);
    setVisitLoading(true);
    const { error } = await supabase.from("visits").insert({
      clinic_id: profile.clinic_id,
      patient_id: patient.id,
      doctor_id: profile.role === "doctor" ? profile.id : null,
      reason_for_visit: visitForm.reasonForVisit || null,
      chief_complaint: visitForm.chiefComplaint || null,
      blood_pressure: visitForm.bloodPressure || null,
      heart_rate_bpm: visitForm.heartRate ? Number(visitForm.heartRate) : null,
      temperature_c: visitForm.temperature ? Number(visitForm.temperature) : null,
      oxygen_saturation: visitForm.oxygenSaturation ? Number(visitForm.oxygenSaturation) : null,
      weight_kg: visitForm.weight ? Number(visitForm.weight) : null,
      height_cm: visitForm.height ? Number(visitForm.height) : null,
      examination: visitForm.examination || null,
      diagnosis: visitForm.diagnosis || null,
      treatment_plan: visitForm.treatmentPlan || null,
      notes: visitForm.notes || null,
      follow_up_date: visitForm.followUpDate || null,
      visited_at: new Date().toISOString(),
    });
    setVisitLoading(false);
    if (error) { setVisitError(error.message); return; }
    setVisitForm({ ...EMPTY_VISIT_FORM });
    setShowNewVisit(false);
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileLoading(true);
    const { error } = await supabase.from("patients").update({
      gender: profileForm.gender || null,
      address: profileForm.address || null,
      file_number: profileForm.fileNumber || null,
      assigned_doctor_id: profileForm.assignedDoctorId || null,
      allergies: profileForm.allergies || null,
      chronic_conditions: profileForm.chronicConditions || null,
      current_medications: profileForm.currentMedications || null,
      notes: profileForm.notes || null,
    }).eq("id", patient.id);
    setProfileLoading(false);
    if (error) { setProfileError(error.message); return; }
    setEditingProfile(false);
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

  const age = (() => {
    if (!patient.date_of_birth) return null;
    const dob = new Date(patient.date_of_birth);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  })();

  const lastVisit = visits[0];
  const assignedDoctorName = patient.assigned_doctor?.full_name ?? null;

  return (
    <div className="app-shell">
      <main className="app-main" style={{ maxWidth: 900 }}>
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
                {patient.file_number ? ` — ملف رقم ${patient.file_number}` : ""}
                {age !== null ? ` — ${age} سنة` : ""}
                {patient.gender ? ` — ${GENDER_LABEL[patient.gender] ?? patient.gender}` : ""}
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

        {totalDueUsd > 0 && isFrontDesk && (
          <div className="stat-grid" style={{ marginBottom: "var(--space-5)" }}>
            <div className="stat-card">
              <div className="stat-label">مبلغ مستحق على المريض (تقريبي بالدولار)</div>
              <div className="stat-value" style={{ color: "var(--danger)" }}>${totalDueUsd.toFixed(2)}</div>
              <div className="subtitle" style={{ margin: 0 }}>سعر الصرف: {exchangeRate.toLocaleString("en-US")} ل.ل/$</div>
            </div>
          </div>
        )}

        <div className="tab-bar" style={{ display: "flex", gap: 6, marginBottom: "var(--space-4)", flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={tab === t.key ? "tab-btn active" : "tab-btn"}
              style={{
                width: "auto", marginTop: 0, padding: "10px 16px", borderRadius: 0,
                background: "transparent", border: "none",
                borderBottom: tab === t.key ? "2px solid var(--brand-600)" : "2px solid transparent",
                color: tab === t.key ? "var(--brand-700)" : "var(--text-muted)",
                fontWeight: tab === t.key ? 700 : 500, cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="card mb-5">
              <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>ملف المريض</h2>
                {isStaff && !editingProfile && (
                  <button type="button" className="btn-danger-sm" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }} onClick={() => setEditingProfile(true)}>
                    تعديل الملف
                  </button>
                )}
              </div>

              {!editingProfile && (
                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div><label style={{ marginBottom: 2 }}>تاريخ الميلاد</label><div>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString("ar-LB") : "—"}</div></div>
                  <div><label style={{ marginBottom: 2 }}>الجنس</label><div>{patient.gender ? (GENDER_LABEL[patient.gender] ?? patient.gender) : "—"}</div></div>
                  <div><label style={{ marginBottom: 2 }}>رقم الملف</label><div>{patient.file_number ?? "—"}</div></div>
                  <div><label style={{ marginBottom: 2 }}>الطبيب المسؤول</label><div>{assignedDoctorName ?? "—"}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>العنوان</label><div>{patient.address ?? "—"}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>الأمراض المزمنة</label><div>{patient.chronic_conditions ?? "—"}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>الأدوية الحالية</label><div>{patient.current_medications ?? "—"}</div></div>
                  <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>ملاحظات</label><div>{patient.notes ?? "—"}</div></div>
                </div>
              )}

              {editingProfile && (
                <form onSubmit={saveProfile} style={{ marginTop: 12 }}>
                  <div className="grid-2">
                    <div>
                      <label>الجنس</label>
                      <select value={profileForm.gender} onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}>
                        <option value="">—</option>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label>رقم الملف</label>
                      <input value={profileForm.fileNumber} onChange={(e) => setProfileForm({ ...profileForm, fileNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div>
                      <label>العنوان</label>
                      <input value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
                    </div>
                    <div>
                      <label>الطبيب المسؤول</label>
                      <select value={profileForm.assignedDoctorId} onChange={(e) => setProfileForm({ ...profileForm, assignedDoctorId: e.target.value })}>
                        <option value="">—</option>
                        {doctors.map((d) => (<option key={d.id} value={d.id}>{d.full_name}</option>))}
                      </select>
                    </div>
                  </div>
                  <label>الحساسية</label>
                  <input value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} />
                  <label>الأمراض المزمنة</label>
                  <input value={profileForm.chronicConditions} onChange={(e) => setProfileForm({ ...profileForm, chronicConditions: e.target.value })} />
                  <label>الأدوية الحالية</label>
                  <input value={profileForm.currentMedications} onChange={(e) => setProfileForm({ ...profileForm, currentMedications: e.target.value })} />
                  <label>ملاحظات</label>
                  <input value={profileForm.notes} onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })} />
                  {profileError && <p className="error">{profileError}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="primary" disabled={profileLoading}>{profileLoading ? "..." : "حفظ"}</button>
                    <button type="button" className="btn-danger-sm" onClick={() => setEditingProfile(false)}>إلغاء</button>
                  </div>
                </form>
              )}
            </div>

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 8 }}>آخر زيارة</h2>
              {!lastVisit && <div className="empty-state">لا يوجد زيارات بعد</div>}
              {lastVisit && (
                <div className="list-item">
                  <div className="subtitle" style={{ margin: 0 }}>
                    {new Date(lastVisit.visited_at).toLocaleString("ar-LB")} — د. {lastVisit.profiles?.full_name ?? "—"}
                  </div>
                  {lastVisit.diagnosis && <div style={{ fontWeight: 600 }}>{lastVisit.diagnosis}</div>}
                  {lastVisit.reason_for_visit && <div className="subtitle" style={{ margin: 0 }}>سبب الزيارة: {lastVisit.reason_for_visit}</div>}
                </div>
              )}
            </div>

            <div className="stat-grid" style={{ marginBottom: "var(--space-5)" }}>
              <div className="stat-card">
                <div className="stat-label">عدد الزيارات</div>
                <div className="stat-value">{visits.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">الوصفات</div>
                <div className="stat-value">{prescriptions.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">الفواتير</div>
                <div className="stat-value">{invoices.length}</div>
              </div>
            </div>
          </>
        )}

        {tab === "visits" && (
          <>
            {isStaff && (
              <div className="card mb-5">
                <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 className="section-title" style={{ marginBottom: showNewVisit ? 12 : 0 }}>استشارة جديدة</h2>
                  {!showNewVisit && (
                    <button type="button" className="primary" style={{ width: "auto", marginTop: 0 }} onClick={() => setShowNewVisit(true)}>
                      + بدء استشارة جديدة
                    </button>
                  )}
                </div>
                {showNewVisit && (
                  <form onSubmit={addVisit}>
                    <label>سبب الزيارة</label>
                    <input value={visitForm.reasonForVisit} onChange={(e) => setVisitForm({ ...visitForm, reasonForVisit: e.target.value })} />
                    <label>الشكوى الرئيسية</label>
                    <input value={visitForm.chiefComplaint} onChange={(e) => setVisitForm({ ...visitForm, chiefComplaint: e.target.value })} />

                    <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: "0.95rem" }}>العلامات الحيوية (Vital Signs)</h3>
                    <div className="grid-2">
                      <div>
                        <label>ضغط الدم</label>
                        <input placeholder="مثال: 120/80" value={visitForm.bloodPressure} onChange={(e) => setVisitForm({ ...visitForm, bloodPressure: e.target.value })} />
                      </div>
                      <div>
                        <label>معدل النبض (bpm)</label>
                        <input type="number" value={visitForm.heartRate} onChange={(e) => setVisitForm({ ...visitForm, heartRate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div>
                        <label>الحرارة (°C)</label>
                        <input type="number" step="0.1" value={visitForm.temperature} onChange={(e) => setVisitForm({ ...visitForm, temperature: e.target.value })} />
                      </div>
                      <div>
                        <label>تشبع الأوكسجين (%)</label>
                        <input type="number" value={visitForm.oxygenSaturation} onChange={(e) => setVisitForm({ ...visitForm, oxygenSaturation: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div>
                        <label>الوزن (kg)</label>
                        <input type="number" step="0.1" value={visitForm.weight} onChange={(e) => setVisitForm({ ...visitForm, weight: e.target.value })} />
                      </div>
                      <div>
                        <label>الطول (cm)</label>
                        <input type="number" step="0.1" value={visitForm.height} onChange={(e) => setVisitForm({ ...visitForm, height: e.target.value })} />
                      </div>
                    </div>

                    <h3 style={{ marginTop: 16, marginBottom: 8, fontSize: "0.95rem" }}>الفحص والتشخيص</h3>
                    <label>الفحص السريري (Examination)</label>
                    <input value={visitForm.examination} onChange={(e) => setVisitForm({ ...visitForm, examination: e.target.value })} />
                    <label>التشخيص</label>
                    <input value={visitForm.diagnosis} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} />
                    <label>خطة العلاج</label>
                    <input value={visitForm.treatmentPlan} onChange={(e) => setVisitForm({ ...visitForm, treatmentPlan: e.target.value })} />
                    <label>ملاحظات الطبيب</label>
                    <input value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
                    <label>تاريخ المراجعة القادمة</label>
                    <input type="date" value={visitForm.followUpDate} onChange={(e) => setVisitForm({ ...visitForm, followUpDate: e.target.value })} />

                    {visitError && <p className="error">{visitError}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="primary" disabled={visitLoading}>{visitLoading ? "..." : "حفظ الزيارة"}</button>
                      <button type="button" className="btn-danger-sm" onClick={() => { setShowNewVisit(false); setVisitForm({ ...EMPTY_VISIT_FORM }); }}>إلغاء</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 8 }}>سجل الزيارات</h2>
              {visits.length === 0 && <div className="empty-state">لا يوجد زيارات بعد</div>}
              {visits.map((v) => (
                <div key={v.id} className="list-item">
                  <div className="subtitle" style={{ margin: 0 }}>
                    {new Date(v.visited_at).toLocaleString("ar-LB")} — د. {v.profiles?.full_name ?? "—"}
                  </div>
                  {v.reason_for_visit && <div style={{ fontWeight: 600 }}>سبب الزيارة: {v.reason_for_visit}</div>}
                  {v.chief_complaint && <div className="subtitle" style={{ margin: 0 }}>الشكوى: {v.chief_complaint}</div>}
                  {(v.blood_pressure || v.heart_rate_bpm || v.temperature_c || v.oxygen_saturation || v.weight_kg || v.height_cm) && (
                    <div className="subtitle" style={{ margin: 0 }}>
                      {v.blood_pressure ? `ضغط: ${v.blood_pressure} ` : ""}
                      {v.heart_rate_bpm ? `نبض: ${v.heart_rate_bpm} ` : ""}
                      {v.temperature_c ? `حرارة: ${v.temperature_c}° ` : ""}
                      {v.oxygen_saturation ? `SpO2: ${v.oxygen_saturation}% ` : ""}
                      {v.weight_kg ? `وزن: ${v.weight_kg}kg ` : ""}
                      {v.height_cm ? `طول: ${v.height_cm}cm` : ""}
                    </div>
                  )}
                  {v.examination && <div className="subtitle" style={{ margin: 0 }}>الفحص: {v.examination}</div>}
                  {v.diagnosis && <div style={{ fontWeight: 600 }}>التشخيص: {v.diagnosis}</div>}
                  {v.treatment_plan && <div className="subtitle" style={{ margin: 0 }}>خطة العلاج: {v.treatment_plan}</div>}
                  {v.notes && <div className="subtitle" style={{ margin: 0 }}>{v.notes}</div>}
                  {v.follow_up_date && <div className="subtitle" style={{ margin: 0 }}>مراجعة بتاريخ: {new Date(v.follow_up_date).toLocaleDateString("ar-LB")}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "history" && (
          <div className="card mb-5">
            <h2 className="section-title" style={{ marginBottom: 8 }}>التاريخ الطبي</h2>
            <div className="grid-2">
              <div><label style={{ marginBottom: 2 }}>فصيلة الدم</label><div>{patient.blood_type ?? "—"}</div></div>
              <div><label style={{ marginBottom: 2 }}>الحساسية</label><div>{patient.allergies ?? "—"}</div></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>الأمراض المزمنة</label><div>{patient.chronic_conditions ?? "—"}</div></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ marginBottom: 2 }}>الأدوية الحالية</label><div>{patient.current_medications ?? "—"}</div></div>
            </div>
            <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: "0.95rem" }}>تشخيصات سابقة</h3>
            {visits.filter((v) => v.diagnosis).length === 0 && <div className="empty-state">لا يوجد تشخيصات مسجلة</div>}
            {visits.filter((v) => v.diagnosis).map((v) => (
              <div key={v.id} className="list-item">
                <div className="subtitle" style={{ margin: 0 }}>{new Date(v.visited_at).toLocaleDateString("ar-LB")}</div>
                <div style={{ fontWeight: 600 }}>{v.diagnosis}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "prescriptions" && (
          <>
            {isDoctor && (
              <div className="card mb-5">
                <h2 className="section-title" style={{ marginBottom: 12 }}>وصفة طبية جديدة</h2>
                <form onSubmit={savePrescription}>
                  <label>بحث عن دواء</label>
                  <input
                    value={drugQuery}
                    onChange={(e) => searchDrugs(e.target.value)}
                    placeholder="اكتب اسم الدواء..."
                  />
                  {drugResults.length > 0 && (
                    <div className="card" style={{ marginTop: 6, padding: 8 }}>
                      {drugResults.map((d) => (
                        <div
                          key={d.id}
                          className="list-item"
                          style={{ cursor: "pointer" }}
                          onClick={() => addRxItem(d)}
                        >
                          {d.name} {d.strength ? `(${d.strength})` : ""}
                          {d.generic_name && <span className="subtitle" style={{ margin: 0 }}> — {d.generic_name}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {drugQuery.trim() && drugResults.length === 0 && (
                    <button type="button" className="btn-danger-sm" style={{ marginTop: 6 }} onClick={() => addRxItem()}>
                      إضافة "{drugQuery}" كدواء جديد
                    </button>
                  )}

                  {rxItems.map((it, idx) => (
                    <div key={idx} className="card" style={{ marginTop: 10, padding: 10 }}>
                      <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{it.name}</strong>
                        <button type="button" className="btn-danger-sm" onClick={() => removeRxItem(idx)}>حذف</button>
                      </div>
                      <div className="grid-2" style={{ marginTop: 8 }}>
                        <div>
                          <label>الجرعة</label>
                          <input value={it.dosage} onChange={(e) => updateRxItem(idx, "dosage", e.target.value)} placeholder="مثال: حبة واحدة" />
                        </div>
                        <div>
                          <label>التكرار</label>
                          <input value={it.frequency} onChange={(e) => updateRxItem(idx, "frequency", e.target.value)} placeholder="مثال: 3 مرات يومياً" />
                        </div>
                      </div>
                      <div className="grid-2">
                        <div>
                          <label>المدة</label>
                          <input value={it.duration} onChange={(e) => updateRxItem(idx, "duration", e.target.value)} placeholder="مثال: 7 أيام" />
                        </div>
                        <div>
                          <label>تعليمات إضافية</label>
                          <input value={it.instructions} onChange={(e) => updateRxItem(idx, "instructions", e.target.value)} placeholder="مثال: بعد الأكل" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <label style={{ marginTop: 12 }}>ملاحظات عامة</label>
                  <input value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} />
                  {rxError && <p className="error">{rxError}</p>}
                  <button className="primary" disabled={rxLoading}>{rxLoading ? "..." : "حفظ الوصفة"}</button>
                </form>
              </div>
            )}

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 8 }}>الوصفات الطبية</h2>
              {prescriptions.length === 0 && <div className="empty-state">لا يوجد وصفات بعد</div>}
              {prescriptions.map((rx) => (
                <div key={rx.id} className="row list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{new Date(rx.issued_at).toLocaleDateString("ar-LB")} — د. {rx.profiles?.full_name ?? "—"}</div>
                    <div className="subtitle" style={{ margin: 0 }}>
                      {(rx.prescription_items ?? []).map((it: any) => it.drugs?.name ?? it.drug_name_free_text).join("، ")}
                    </div>
                  </div>
                  <a className="link" href={`/dashboard/prescriptions/${rx.id}/print`} target="_blank" rel="noreferrer">🖨 طباعة / PDF</a>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "documents" && (
          <>
            {isStaff && (
              <div className="card mb-5">
                <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة مستند</h2>
                <form onSubmit={addReport}>
                  <label>عنوان المستند</label>
                  <input required value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} placeholder="مثال: تحليل دم، صورة أشعة، تقرير طبي..." />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={reportForm.sharedWithPatient}
                      onChange={(e) => setReportForm({ ...reportForm, sharedWithPatient: e.target.checked })}
                    />
                    مشاركة المستند مع المريض ببوابته
                  </label>
                  {reportError && <p className="error">{reportError}</p>}
                  <button className="primary" disabled={reportLoading}>{reportLoading ? "..." : "حفظ المستند"}</button>
                </form>
              </div>
            )}

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 8 }}>المستندات والمرفقات</h2>
              {reports.length === 0 && <div className="empty-state">لا يوجد مستندات بعد</div>}
              {reports.map((r) => (
                <div key={r.id} className="row list-item">
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <span className={`badge ${r.shared_with_patient ? "badge-success" : "badge-muted"}`}>
                    {r.shared_with_patient ? "مشارك مع المريض" : "داخلي"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "billing" && (
          <>
            {isFrontDesk && (
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
                    {isFrontDesk && (
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

                  {isFrontDesk && i.status !== "paid" && (
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
          </>
        )}
      </main>
    </div>
  );
}
