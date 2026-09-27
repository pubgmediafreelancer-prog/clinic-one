"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VACCINE_STATUS_LABEL: Record<string, string> = { scheduled: "مجدولة", given: "أُعطيت", overdue: "متأخرة" };

function GrowthChart({ data }: { data: any[] }) {
  const width = 640, height = 220, pad = 36;
  const ageMonths = data.map((g) => g.age_in_days / 30);
  const maxAge = Math.max(1, ...ageMonths);
  const series: { key: string; label: string; color: string }[] = [
    { key: "weight_kg", label: "الوزن (كغ)", color: "#2563eb" },
    { key: "height_cm", label: "الطول (سم)", color: "#16a34a" },
  ];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", background: "#fff", borderRadius: 8 }}>
      <line x1={pad} y1={height - pad} x2={width - 10} y2={height - pad} stroke="#ccc" />
      <line x1={pad} y1={10} x2={pad} y2={height - pad} stroke="#ccc" />
      {series.map((s) => {
        const values = data.map((g) => Number(g[s.key]) || 0).filter((v) => v > 0);
        if (values.length < 2) return null;
        const maxVal = Math.max(...data.map((g) => Number(g[s.key]) || 0), 1);
        const points = data
          .map((g, i) => {
            const v = Number(g[s.key]);
            if (!v) return null;
            const x = pad + (ageMonths[i] / maxAge) * (width - pad - 20);
            const y = height - pad - (v / maxVal) * (height - pad - 20);
            return `${x},${y}`;
          })
          .filter(Boolean)
          .join(" ");
        return <polyline key={s.key} points={points} fill="none" stroke={s.color} strokeWidth={2} />;
      })}
      {series.map((s, i) => (
        <g key={s.key} transform={`translate(${pad + i * 140}, 14)`}>
          <rect width={10} height={10} fill={s.color} rx={2} />
          <text x={16} y={9} fontSize={11} fill="#333">{s.label}</text>
        </g>
      ))}
      <text x={pad} y={height - 8} fontSize={10} fill="#999">العمر (أشهر) →</text>
    </svg>
  );
}

function ageInDays(dob: string | null) {
  if (!dob) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dob).getTime()) / 86400000));
}

export default function PediatricsClient({ profile, patients }: { profile: any; patients: any[] }) {
  const supabase = createClient();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [growth, setGrowth] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [growthForm, setGrowthForm] = useState({ weight: "", height: "", head: "" });
  const [vaccineForm, setVaccineForm] = useState({ name: "", dose: "1", date: "" });
  const [loading, setLoading] = useState(false);

  const patient = patients.find((p) => p.id === patientId);

  useEffect(() => { if (patientId) load(patientId); }, [patientId]);

  async function load(pid: string) {
    setLoading(true);
    const { data: g } = await supabase.from("growth_records").select("*").eq("patient_id", pid).order("measured_at", { ascending: false });
    const { data: v } = await supabase.from("vaccinations").select("*").eq("patient_id", pid).order("scheduled_at", { ascending: true });
    setGrowth(g ?? []);
    setVaccines(v ?? []);
    setLoading(false);
  }

  async function addGrowth() {
    if (!patientId) return;
    await supabase.from("growth_records").insert({
      patient_id: patientId,
      age_in_days: ageInDays(patient?.date_of_birth),
      weight_kg: growthForm.weight ? Number(growthForm.weight) : null,
      height_cm: growthForm.height ? Number(growthForm.height) : null,
      head_circum_cm: growthForm.head ? Number(growthForm.head) : null,
    });
    setGrowthForm({ weight: "", height: "", head: "" });
    load(patientId);
  }

  async function addVaccine() {
    if (!patientId || !vaccineForm.name || !vaccineForm.date) return;
    await supabase.from("vaccinations").insert({
      patient_id: patientId,
      vaccine_name: vaccineForm.name,
      dose_number: Number(vaccineForm.dose) || 1,
      scheduled_at: vaccineForm.date,
    });
    setVaccineForm({ name: "", dose: "1", date: "" });
    load(patientId);
  }

  async function markGiven(id: string) {
    await supabase.from("vaccinations").update({ administered_at: new Date().toISOString().slice(0, 10) }).eq("id", id);
    load(patientId);
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">قسم الأطفال</div>
          <h1>النمو والتطعيمات</h1>
          <a href="/dashboard" className="link">→ رجوع للداشبورد</a>
        </div>

        <div className="card mb-5">
          <label>اختر الطفل</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {!loading && patientId && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>تسجيل قياس جديد</h2>
              <div className="grid-2">
                <div><label>الوزن (كغ)</label><input type="number" step="0.1" value={growthForm.weight} onChange={(e) => setGrowthForm({ ...growthForm, weight: e.target.value })} /></div>
                <div><label>الطول (سم)</label><input type="number" step="0.1" value={growthForm.height} onChange={(e) => setGrowthForm({ ...growthForm, height: e.target.value })} /></div>
              </div>
              <label>محيط الرأس (سم)</label>
              <input type="number" step="0.1" value={growthForm.head} onChange={(e) => setGrowthForm({ ...growthForm, head: e.target.value })} />
              <button className="primary" style={{ marginTop: 10, width: "auto" }} onClick={addGrowth}>حفظ القياس</button>
            </div>

            {growth.length > 1 && (
              <div className="card mb-5">
                <h2 className="section-title" style={{ marginBottom: 8 }}>منحنى النمو (Growth Chart)</h2>
                <GrowthChart data={[...growth].reverse()} />
              </div>
            )}

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 8 }}>سجل النمو</h2>
              {growth.length === 0 && <div className="empty-state">لا يوجد قياسات بعد</div>}
              {growth.map((g) => {
                const bmi = g.weight_kg && g.height_cm ? (Number(g.weight_kg) / Math.pow(Number(g.height_cm) / 100, 2)) : null;
                return (
                  <div key={g.id} className="list-item subtitle" style={{ margin: 0 }}>
                    عمر {Math.floor(g.age_in_days / 30)} شهر — الوزن {g.weight_kg ?? "—"} كغ — الطول {g.height_cm ?? "—"} سم — محيط الرأس {g.head_circum_cm ?? "—"} سم
                    {bmi ? ` — BMI ${bmi.toFixed(1)}` : ""}
                  </div>
                );
              })}
            </div>

            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>جدولة تطعيم</h2>
              <div className="grid-2">
                <div><label>اسم التطعيم</label><input value={vaccineForm.name} onChange={(e) => setVaccineForm({ ...vaccineForm, name: e.target.value })} /></div>
                <div><label>رقم الجرعة</label><input type="number" min="1" value={vaccineForm.dose} onChange={(e) => setVaccineForm({ ...vaccineForm, dose: e.target.value })} /></div>
              </div>
              <label>تاريخ الموعد</label>
              <input type="date" value={vaccineForm.date} onChange={(e) => setVaccineForm({ ...vaccineForm, date: e.target.value })} />
              <button className="primary" style={{ marginTop: 10, width: "auto" }} onClick={addVaccine}>حفظ الموعد</button>
            </div>

            <div className="card">
              <h2 className="section-title" style={{ marginBottom: 8 }}>جدول التطعيمات</h2>
              {vaccines.length === 0 && <div className="empty-state">لا يوجد تطعيمات مجدولة</div>}
              {vaccines.map((v) => {
                const overdue = !v.administered_at && new Date(v.scheduled_at) < new Date();
                const status = v.administered_at ? "given" : overdue ? "overdue" : "scheduled";
                return (
                  <div key={v.id} className="row list-item" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{v.vaccine_name} — جرعة {v.dose_number}</div>
                      <div className="subtitle" style={{ margin: 0 }}>موعد: {new Date(v.scheduled_at).toLocaleDateString("ar-LB")}</div>
                    </div>
                    <span className={`badge ${status === "given" ? "badge-success" : status === "overdue" ? "badge-danger" : "badge-warn"}`}>
                      {VACCINE_STATUS_LABEL[status]}
                    </span>
                    {!v.administered_at && <button className="btn-sm" onClick={() => markGiven(v.id)}>تسجيل كمُعطاة</button>}
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
