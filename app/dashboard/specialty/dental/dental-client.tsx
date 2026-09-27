"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADULT_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const COND_LABEL: Record<string, string> = {
  healthy: "سليم", cavity: "تسوّس", filled: "محشو", crown: "تلبيس", missing: "مفقود", root_canal: "عصب",
};
const COND_COLOR: Record<string, string> = {
  healthy: "#e5e7eb", cavity: "#f87171", filled: "#60a5fa", crown: "#fbbf24", missing: "#9ca3af", root_canal: "#a78bfa",
};

export default function DentalClient({ profile, patients }: { profile: any; patients: any[] }) {
  const supabase = createClient();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [chart, setChart] = useState<any>(null);
  const [teeth, setTeeth] = useState<Record<number, any>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [treatmentNote, setTreatmentNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) loadChart(patientId);
  }, [patientId]);

  async function loadChart(pid: string) {
    setLoading(true);
    let { data: chartRow } = await supabase.from("dental_charts").select("id").eq("patient_id", pid).maybeSingle();
    if (!chartRow) {
      const { data: created } = await supabase.from("dental_charts").insert({ patient_id: pid }).select("id").single();
      chartRow = created;
    }
    setChart(chartRow);
    const { data: records } = await supabase.from("tooth_records").select("id, tooth_number, condition").eq("chart_id", chartRow!.id);
    const map: Record<number, any> = {};
    for (const r of records ?? []) map[Number(r.tooth_number)] = r;
    setTeeth(map);
    setLoading(false);
    setSelectedTooth(null);
  }

  async function setCondition(toothNum: number, condition: string) {
    if (!chart) return;
    const existing = teeth[toothNum];
    if (existing) {
      await supabase.from("tooth_records").update({ condition }).eq("id", existing.id);
      setTeeth({ ...teeth, [toothNum]: { ...existing, condition } });
    } else {
      const { data } = await supabase.from("tooth_records").insert({
        chart_id: chart.id, tooth_number: String(toothNum), condition,
      }).select("id, tooth_number, condition").single();
      setTeeth({ ...teeth, [toothNum]: data });
    }
  }

  async function addTreatment() {
    if (!selectedTooth || !treatmentNote.trim()) return;
    const rec = teeth[selectedTooth];
    if (!rec) return;
    await supabase.from("tooth_treatments").insert({ tooth_id: rec.id, procedure: treatmentNote });
    setTreatmentNote("");
    alert("تم حفظ إجراء العلاج");
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">قسم الأسنان</div>
          <h1>مخطط الأسنان (Odontogram)</h1>
          <a href="/dashboard" className="link">→ رجوع للداشبورد</a>
        </div>

        <div className="card mb-5">
          <label>اختر المريض</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {loading && <div className="empty-state">تحميل...</div>}

        {!loading && patientId && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>الفك العلوي</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {ADULT_TEETH.slice(0, 16).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTooth(t)}
                    style={{
                      width: 40, height: 40, borderRadius: 8, border: selectedTooth === t ? "3px solid var(--brand-700)" : "1px solid #999",
                      background: teeth[t] ? COND_COLOR[teeth[t].condition] : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <h2 className="section-title" style={{ marginTop: 20, marginBottom: 12 }}>الفك السفلي</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {ADULT_TEETH.slice(16, 32).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTooth(t)}
                    style={{
                      width: 40, height: 40, borderRadius: 8, border: selectedTooth === t ? "3px solid var(--brand-700)" : "1px solid #999",
                      background: teeth[t] ? COND_COLOR[teeth[t].condition] : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                {Object.entries(COND_LABEL).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: COND_COLOR[k], display: "inline-block" }} />
                    {v}
                  </div>
                ))}
              </div>
            </div>

            {selectedTooth && (
              <div className="card">
                <h2 className="section-title" style={{ marginBottom: 12 }}>السن رقم {selectedTooth}</h2>
                <label>الحالة</label>
                <select
                  value={teeth[selectedTooth]?.condition ?? "healthy"}
                  onChange={(e) => setCondition(selectedTooth, e.target.value)}
                >
                  {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                <label style={{ marginTop: 12 }}>تسجيل إجراء علاجي</label>
                <input value={treatmentNote} onChange={(e) => setTreatmentNote(e.target.value)} placeholder="مثال: حشو تجميلي" />
                <button className="primary" style={{ marginTop: 8, width: "auto" }} onClick={addTreatment}>حفظ الإجراء</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
