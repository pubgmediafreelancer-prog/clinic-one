"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}
function gestationalWeek(lmp: string) {
  const days = Math.floor((Date.now() - new Date(lmp).getTime()) / 86400000);
  return Math.max(0, Math.floor(days / 7));
}

export default function ObgynClient({ profile, patients }: { profile: any; patients: any[] }) {
  const supabase = createClient();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [pregnancies, setPregnancies] = useState<any[]>([]);
  const [metricsByPregnancy, setMetricsByPregnancy] = useState<Record<string, any[]>>({});
  const [lmp, setLmp] = useState("");
  const [metricForm, setMetricForm] = useState<Record<string, { week: string; weight: string; hr: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (patientId) load(patientId); }, [patientId]);

  async function load(pid: string) {
    setLoading(true);
    const { data: p } = await supabase.from("pregnancies").select("*").eq("patient_id", pid).order("created_at", { ascending: false });
    setPregnancies(p ?? []);
    const ids = (p ?? []).map((r: any) => r.id);
    if (ids.length) {
      const { data: metrics } = await supabase.from("fetal_metrics").select("*").in("pregnancy_id", ids).order("gestational_week", { ascending: true });
      const map: Record<string, any[]> = {};
      for (const m of metrics ?? []) (map[m.pregnancy_id] ??= []).push(m);
      setMetricsByPregnancy(map);
    } else setMetricsByPregnancy({});
    setLoading(false);
  }

  async function startPregnancy() {
    if (!patientId || !lmp) return;
    const edd = addDays(lmp, 280);
    await supabase.from("pregnancies").insert({
      patient_id: patientId,
      last_menstrual_date: lmp,
      estimated_due_date: edd.toISOString().slice(0, 10),
    });
    setLmp("");
    load(patientId);
  }

  async function endPregnancy(id: string) {
    await supabase.from("pregnancies").update({ active: false }).eq("id", id);
    load(patientId);
  }

  async function addMetric(pregnancyId: string) {
    const f = metricForm[pregnancyId];
    if (!f?.week) return;
    await supabase.from("fetal_metrics").insert({
      pregnancy_id: pregnancyId,
      gestational_week: Number(f.week),
      weight_grams: f.weight ? Number(f.weight) : null,
      heart_rate_bpm: f.hr ? Number(f.hr) : null,
    });
    setMetricForm({ ...metricForm, [pregnancyId]: { week: "", weight: "", hr: "" } });
    load(patientId);
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">قسم النساء والولادة</div>
          <h1>متابعة الحمل</h1>
          <a href="/dashboard" className="link">→ رجوع للداشبورد</a>
        </div>

        <div className="card mb-5">
          <label>اختر المريضة</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {!loading && patientId && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>حمل جديد — حساب تاريخ الولادة المتوقع</h2>
              <label>تاريخ آخر دورة شهرية (LMP)</label>
              <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
              {lmp && (
                <p className="subtitle" style={{ marginTop: 6 }}>
                  تاريخ الولادة المتوقع (EDD): {addDays(lmp, 280).toLocaleDateString("ar-LB")} — الأسبوع الحالي: {gestationalWeek(lmp)}
                </p>
              )}
              <button className="primary" style={{ marginTop: 8, width: "auto" }} onClick={startPregnancy}>بدء تتبع الحمل</button>
            </div>

            <div className="card">
              <h2 className="section-title" style={{ marginBottom: 8 }}>حالات الحمل</h2>
              {pregnancies.length === 0 && <div className="empty-state">لا يوجد حمل مسجل</div>}
              {pregnancies.map((p) => {
                const metrics = metricsByPregnancy[p.id] ?? [];
                const currentWeek = gestationalWeek(p.last_menstrual_date);
                const f = metricForm[p.id] ?? { week: String(currentWeek), weight: "", hr: "" };
                return (
                  <div key={p.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
                    <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>تاريخ الولادة المتوقع: {new Date(p.estimated_due_date).toLocaleDateString("ar-LB")}</div>
                        <div className="subtitle" style={{ margin: 0 }}>الأسبوع الحالي: {currentWeek} — {p.active ? "حمل نشط" : "منتهي"}</div>
                      </div>
                      <span className={`badge ${p.active ? "badge-success" : "badge-muted"}`}>{p.active ? "نشط" : "منتهي"}</span>
                    </div>

                    {metrics.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        {metrics.map((m) => (
                          <div key={m.id} className="subtitle" style={{ margin: 0 }}>
                            الأسبوع {m.gestational_week} — الوزن {m.weight_grams ?? "—"} غرام — نبض القلب {m.heart_rate_bpm ?? "—"} bpm
                          </div>
                        ))}
                      </div>
                    )}

                    {p.active && (
                      <div className="row" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <input type="number" placeholder="الأسبوع" value={f.week} onChange={(e) => setMetricForm({ ...metricForm, [p.id]: { ...f, week: e.target.value } })} style={{ width: 90 }} />
                        <input type="number" placeholder="الوزن (غرام)" value={f.weight} onChange={(e) => setMetricForm({ ...metricForm, [p.id]: { ...f, weight: e.target.value } })} style={{ width: 130 }} />
                        <input type="number" placeholder="نبض القلب" value={f.hr} onChange={(e) => setMetricForm({ ...metricForm, [p.id]: { ...f, hr: e.target.value } })} style={{ width: 110 }} />
                        <button className="btn-sm" onClick={() => addMetric(p.id)}>حفظ القياس</button>
                        <button className="btn-danger-sm" onClick={() => endPregnancy(p.id)}>إنهاء تتبع الحمل</button>
                      </div>
                    )}
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
