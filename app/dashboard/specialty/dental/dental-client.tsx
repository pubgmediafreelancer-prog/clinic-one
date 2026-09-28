"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADULT_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const COND_LABEL: Record<string, string> = {
  healthy: "سليم", cavity: "تسوّس (Caries)", filled: "محشو", crown: "تلبيس", missing: "مفقود", root_canal: "عصب",
  extraction: "قلع", implant: "زراعة", whitening: "تبييض",
};
const COND_COLOR: Record<string, string> = {
  healthy: "#e5e7eb", cavity: "#f87171", filled: "#60a5fa", crown: "#fbbf24", missing: "#9ca3af", root_canal: "#a78bfa",
  extraction: "#ef4444", implant: "#34d399", whitening: "#67e8f9",
};

const PLAN_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة", active: "نشطة", completed: "مكتملة", archived: "مؤرشفة",
};
const PLAN_STATUS_BADGE: Record<string, string> = {
  draft: "#9ca3af", active: "#34d399", completed: "#60a5fa", archived: "#d1d5db",
};

const CATEGORY_LABEL: Record<string, string> = {
  diagnostic: "تشخيصي", restorative: "ترميمي", endodontics: "علاج عصب", periodontics: "لثة",
  prosthodontics: "تعويضات", surgery: "جراحة", orthodontics: "تقويم", other: "أخرى",
};
const SURFACE_LABEL: Record<string, string> = {
  mesial: "أنسي (Mesial)", distal: "وحشي (Distal)", occlusal: "إطباقي (Occlusal)",
  incisal: "قاطع (Incisal)", facial: "وجهي (Facial)", lingual: "لساني (Lingual)", buccal: "دهليزي (Buccal)",
};
const PRIORITY_LABEL: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const OP_STATUS_LABEL: Record<string, string> = {
  planned: "مخطط له", in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغى",
};
const OP_STATUS_COLOR: Record<string, string> = {
  planned: "#f87171", in_progress: "#fbbf24", completed: "#60a5fa", cancelled: "#9ca3af",
};

type Operation = {
  id: string; plan_id: string; category: string; procedure_name: string; procedure_code: string | null;
  tooth_number: string | null; tooth_surface: string | null; doctor_id: string | null; priority: string;
  cost: number | null; cost_tbd: boolean; status: string; notes: string | null;
};

const emptyOpForm = {
  category: "restorative", procedure_name: "", procedure_code: "", tooth_number: "", tooth_surface: "",
  doctor_id: "", priority: "medium", cost: "", cost_tbd: false, status: "planned", notes: "",
};

export default function DentalClient({ profile, patients, doctors }: { profile: any; patients: any[]; doctors: any[] }) {
  const supabase = createClient();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [chart, setChart] = useState<any>(null);
  const [teeth, setTeeth] = useState<Record<number, any>>({});
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [treatmentNote, setTreatmentNote] = useState("");
  const [treatmentExtraNote, setTreatmentExtraNote] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Treatment plan state ---
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [newPlanName, setNewPlanName] = useState("");
  const [renamingPlan, setRenamingPlan] = useState(false);
  const [planNameDraft, setPlanNameDraft] = useState("");
  const [opModalOpen, setOpModalOpen] = useState(false);
  const [opForm, setOpForm] = useState({ ...emptyOpForm });
  const [editingOpId, setEditingOpId] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadChart(patientId);
      loadPlans(patientId);
    }
  }, [patientId]);

  useEffect(() => {
    if (selectedPlanId) loadOperations(selectedPlanId);
    else setOperations([]);
  }, [selectedPlanId]);

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
    const toothIds = (records ?? []).map((r: any) => r.id);
    if (toothIds.length > 0) {
      const { data: treatments } = await supabase
        .from("tooth_treatments")
        .select("id, tooth_id, procedure, notes, performed_at")
        .in("tooth_id", toothIds)
        .order("performed_at", { ascending: false });
      const byToothId: Record<string, number> = {};
      for (const r of records ?? []) byToothId[r.id] = Number(r.tooth_number);
      setHistory((treatments ?? []).map((t: any) => ({ ...t, toothNumber: byToothId[t.tooth_id] })));
    } else {
      setHistory([]);
    }
    setLoading(false);
    setSelectedTooth(null);
  }

  async function setCondition(toothNum: number, condition: string) {
    if (!chart || !condition) return;
    setError(null);
    const existing = teeth[toothNum];
    if (existing) {
      const { error: updateError } = await supabase.from("tooth_records").update({ condition }).eq("id", existing.id);
      if (updateError) { setError("ما قدرنا نحدّث حالة السن، جربي كمان مرة"); return; }
      setTeeth({ ...teeth, [toothNum]: { ...existing, condition } });
    } else {
      const { data, error: insertError } = await supabase.from("tooth_records").insert({
        chart_id: chart.id, tooth_number: String(toothNum), condition,
      }).select("id, tooth_number, condition").single();
      if (insertError || !data) { setError("ما قدرنا نحفظ حالة السن، جربي كمان مرة"); return; }
      setTeeth({ ...teeth, [toothNum]: data });
    }
  }

  async function addTreatment() {
    if (!selectedTooth || !treatmentNote.trim()) return;
    const rec = teeth[selectedTooth];
    if (!rec) return;
    await supabase.from("tooth_treatments").insert({
      tooth_id: rec.id,
      procedure: treatmentNote,
      notes: treatmentExtraNote || null,
      performed_at: new Date().toISOString(),
    });
    setTreatmentNote("");
    setTreatmentExtraNote("");
    loadChart(patientId);
  }

  // --- Treatment plan functions ---
  async function loadPlans(pid: string) {
    const { data } = await supabase
      .from("treatment_plans")
      .select("id, name, status, notes, created_at")
      .eq("patient_id", pid)
      .order("created_at", { ascending: false });
    const list = data ?? [];
    setPlans(list);
    const active = list.find((p: any) => p.status === "active");
    setSelectedPlanId((active ?? list[0])?.id ?? "");
  }

  async function loadOperations(planId: string) {
    const { data } = await supabase
      .from("plan_operations")
      .select("id, plan_id, category, procedure_name, procedure_code, tooth_number, tooth_surface, doctor_id, priority, cost, cost_tbd, status, notes")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });
    setOperations((data as any) ?? []);
  }

  async function createPlan() {
    if (!patientId || !newPlanName.trim()) return;
    setPlanError(null);
    const { data, error: err } = await supabase
      .from("treatment_plans")
      .insert({ patient_id: patientId, name: newPlanName.trim(), status: "draft" })
      .select("id, name, status, notes, created_at")
      .single();
    if (err || !data) { setPlanError("ما قدرنا ننشئ الخطة"); return; }
    setNewPlanName("");
    await loadPlans(patientId);
    setSelectedPlanId(data.id);
  }

  async function setPlanStatus(planId: string, status: string) {
    setPlanError(null);
    const { error: err } = await supabase.from("treatment_plans").update({ status }).eq("id", planId);
    if (err) { setPlanError("ما قدرنا نحدّث حالة الخطة"); return; }
    await loadPlans(patientId);
    setSelectedPlanId(planId);
  }

  async function savePlanName(planId: string) {
    if (!planNameDraft.trim()) { setRenamingPlan(false); return; }
    await supabase.from("treatment_plans").update({ name: planNameDraft.trim() }).eq("id", planId);
    setRenamingPlan(false);
    await loadPlans(patientId);
    setSelectedPlanId(planId);
  }

  function openAddOperation(prefillTooth?: number) {
    setEditingOpId(null);
    setOpForm({ ...emptyOpForm, tooth_number: prefillTooth ? String(prefillTooth) : "" });
    setOpModalOpen(true);
  }

  function openEditOperation(op: Operation) {
    setEditingOpId(op.id);
    setOpForm({
      category: op.category, procedure_name: op.procedure_name, procedure_code: op.procedure_code ?? "",
      tooth_number: op.tooth_number ?? "", tooth_surface: op.tooth_surface ?? "", doctor_id: op.doctor_id ?? "",
      priority: op.priority, cost: op.cost != null ? String(op.cost) : "", cost_tbd: op.cost_tbd,
      status: op.status, notes: op.notes ?? "",
    });
    setOpModalOpen(true);
  }

  async function saveOperation() {
    if (!selectedPlanId || !opForm.procedure_name.trim()) return;
    setPlanError(null);
    const payload: any = {
      plan_id: selectedPlanId,
      category: opForm.category,
      procedure_name: opForm.procedure_name.trim(),
      procedure_code: opForm.procedure_code.trim() || null,
      tooth_number: opForm.tooth_number.trim() || null,
      tooth_surface: opForm.tooth_surface || null,
      doctor_id: opForm.doctor_id || null,
      priority: opForm.priority,
      cost: opForm.cost_tbd || !opForm.cost ? null : Number(opForm.cost),
      cost_tbd: opForm.cost_tbd,
      status: opForm.status,
      notes: opForm.notes.trim() || null,
    };
    let err;
    if (editingOpId) {
      ({ error: err } = await supabase.from("plan_operations").update(payload).eq("id", editingOpId));
    } else {
      ({ error: err } = await supabase.from("plan_operations").insert(payload));
    }
    if (err) { setPlanError("ما قدرنا نحفظ الإجراء، جربي كمان مرة"); return; }

    // Sync to odontogram: if the operation is completed and a tooth is specified, reflect it on the chart
    if (opForm.status === "completed" && opForm.tooth_number.trim() && chart) {
      const toothNum = Number(opForm.tooth_number.trim());
      if (!Number.isNaN(toothNum)) {
        const condition = categoryToCondition(opForm.category);
        if (condition) await setCondition(toothNum, condition);
      }
    }

    setOpModalOpen(false);
    await loadOperations(selectedPlanId);
  }

  async function updateOperationStatus(op: Operation, status: string) {
    await supabase.from("plan_operations").update({ status }).eq("id", op.id);
    if (status === "completed" && op.tooth_number) {
      const toothNum = Number(op.tooth_number);
      if (!Number.isNaN(toothNum)) {
        const condition = categoryToCondition(op.category);
        if (condition) await setCondition(toothNum, condition);
      }
    }
    await loadOperations(selectedPlanId);
  }

  async function deleteOperation(id: string) {
    await supabase.from("plan_operations").delete().eq("id", id);
    await loadOperations(selectedPlanId);
  }

  function categoryToCondition(category: string): string | null {
    switch (category) {
      case "restorative": return "filled";
      case "endodontics": return "root_canal";
      case "prosthodontics": return "crown";
      case "surgery": return "extraction";
      default: return null;
    }
  }

  const opsByTooth: Record<number, Operation[]> = {};
  for (const op of operations) {
    if (!op.tooth_number) continue;
    const t = Number(op.tooth_number);
    if (Number.isNaN(t)) continue;
    (opsByTooth[t] ||= []).push(op);
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const totalCost = operations.reduce((sum, op) => sum + (op.cost_tbd || op.cost == null ? 0 : Number(op.cost)), 0);
  const hasTbd = operations.some((op) => op.cost_tbd);

  function renderTooth(t: number) {
    const badgeOps = opsByTooth[t] ?? [];
    const badgeColor = badgeOps.length
      ? OP_STATUS_COLOR[
          badgeOps.some((o) => o.status === "planned") ? "planned"
          : badgeOps.some((o) => o.status === "in_progress") ? "in_progress"
          : badgeOps.every((o) => o.status === "completed") ? "completed" : "cancelled"
        ]
      : null;
    return (
      <button
        key={t}
        onClick={() => setSelectedTooth(t)}
        style={{
          position: "relative", width: 40, height: 40, borderRadius: 8,
          border: selectedTooth === t ? "3px solid var(--brand-700)" : "1px solid #999",
          background: teeth[t] ? COND_COLOR[teeth[t].condition] : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}
      >
        {t}
        {badgeColor && (
          <span style={{
            position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%",
            background: badgeColor, border: "1.5px solid #fff",
          }} />
        )}
      </button>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">قسم الأسنان</div>
          <h1>مخطط الأسنان وخطة العلاج</h1>
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
                {ADULT_TEETH.slice(0, 16).map(renderTooth)}
              </div>
              <h2 className="section-title" style={{ marginTop: 20, marginBottom: 12 }}>الفك السفلي</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {ADULT_TEETH.slice(16, 32).map(renderTooth)}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                {Object.entries(COND_LABEL).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: COND_COLOR[k], display: "inline-block" }} />
                    {v}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                {Object.entries(OP_STATUS_LABEL).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#666" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: OP_STATUS_COLOR[k], display: "inline-block" }} />
                    نقطة الإجراء: {v}
                  </div>
                ))}
              </div>
            </div>

            {selectedTooth && (
              <div className="card">
                <h2 className="section-title" style={{ marginBottom: 12 }}>السن رقم {selectedTooth}</h2>
                <label>الحالة</label>
                <select
                  value={teeth[selectedTooth]?.condition ?? ""}
                  onChange={(e) => setCondition(selectedTooth, e.target.value)}
                >
                  <option value="" disabled>اختر الحالة</option>
                  {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {error && <p className="error">{error}</p>}

                <label style={{ marginTop: 12 }}>تسجيل إجراء علاجي (Add Dental Note)</label>
                <input value={treatmentNote} onChange={(e) => setTreatmentNote(e.target.value)} placeholder="مثال: حشو تجميلي" />
                <label style={{ marginTop: 8 }}>ملاحظات إضافية</label>
                <input value={treatmentExtraNote} onChange={(e) => setTreatmentExtraNote(e.target.value)} placeholder="اختياري" />
                <button className="primary" style={{ marginTop: 8, width: "auto" }} onClick={addTreatment}>حفظ الإجراء</button>

                <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: 14 }}>إجراءات خطة العلاج لهذا السن</h3>
                    {selectedPlanId && (
                      <button className="secondary" style={{ width: "auto" }} onClick={() => openAddOperation(selectedTooth)}>
                        + إضافة إجراء
                      </button>
                    )}
                  </div>
                  {!selectedPlanId && <div className="empty-state" style={{ marginTop: 8 }}>أنشئي خطة علاج أولاً بالأسفل</div>}
                  {(opsByTooth[selectedTooth] ?? []).map((op) => (
                    <div key={op.id} className="list-item" style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 600 }}>{op.procedure_name}</div>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 999, color: "#fff",
                          background: OP_STATUS_COLOR[op.status],
                        }}>{OP_STATUS_LABEL[op.status]}</span>
                      </div>
                      <div className="subtitle" style={{ margin: 0 }}>
                        {CATEGORY_LABEL[op.category]}{op.tooth_surface ? ` · ${SURFACE_LABEL[op.tooth_surface]}` : ""} · أولوية {PRIORITY_LABEL[op.priority]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: "var(--space-5)" }}>
              <h2 className="section-title" style={{ marginBottom: 8 }}>سجل الأسنان (Patient Dental History)</h2>
              {history.length === 0 && <div className="empty-state">لا يوجد إجراءات مسجلة</div>}
              {history.map((h) => (
                <div key={h.id} className="list-item">
                  <div className="subtitle" style={{ margin: 0 }}>
                    {new Date(h.performed_at).toLocaleDateString("ar-LB")} — السن رقم {h.toothNumber}
                  </div>
                  <div style={{ fontWeight: 600 }}>{h.procedure}</div>
                  {h.notes && <div className="subtitle" style={{ margin: 0 }}>{h.notes}</div>}
                </div>
              ))}
            </div>

            {/* --- Treatment Plan Manager --- */}
            <div className="card" style={{ marginTop: "var(--space-5)" }}>
              <div className="page-head" style={{ marginBottom: 12 }}>
                <h2 className="section-title" style={{ margin: 0 }}>خطط العلاج (Treatment Plans)</h2>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="اسم خطة جديدة مثل: خطة أ - مثالية"
                  style={{ flex: 1, minWidth: 220 }}
                />
                <button className="primary" style={{ width: "auto" }} onClick={createPlan}>+ خطة جديدة</button>
              </div>
              {planError && <p className="error">{planError}</p>}

              {plans.length === 0 && <div className="empty-state">لا يوجد خطط علاج لهذا المريض بعد</div>}

              {plans.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={selectedPlanId === p.id ? "primary" : "secondary"}
                      style={{ width: "auto", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: PLAN_STATUS_BADGE[p.status], display: "inline-block" }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {selectedPlan && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {renamingPlan ? (
                        <>
                          <input value={planNameDraft} onChange={(e) => setPlanNameDraft(e.target.value)} style={{ width: 220 }} />
                          <button className="secondary" style={{ width: "auto" }} onClick={() => savePlanName(selectedPlan.id)}>حفظ</button>
                        </>
                      ) : (
                        <>
                          <h3 style={{ margin: 0 }}>{selectedPlan.name}</h3>
                          <button
                            className="secondary" style={{ width: "auto" }}
                            onClick={() => { setRenamingPlan(true); setPlanNameDraft(selectedPlan.name); }}
                          >تعديل الاسم</button>
                        </>
                      )}
                      <span style={{
                        fontSize: 12, padding: "3px 10px", borderRadius: 999, color: "#fff",
                        background: PLAN_STATUS_BADGE[selectedPlan.status],
                      }}>{PLAN_STATUS_LABEL[selectedPlan.status]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedPlan.status !== "active" && (
                        <button className="primary" style={{ width: "auto" }} onClick={() => setPlanStatus(selectedPlan.id, "active")}>تفعيل الخطة</button>
                      )}
                      {selectedPlan.status !== "completed" && (
                        <button className="secondary" style={{ width: "auto" }} onClick={() => setPlanStatus(selectedPlan.id, "completed")}>وضع مكتملة</button>
                      )}
                      {selectedPlan.status !== "archived" && (
                        <button className="secondary" style={{ width: "auto" }} onClick={() => setPlanStatus(selectedPlan.id, "archived")}>أرشفة</button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <h4 style={{ margin: 0 }}>الإجراءات ({operations.length})</h4>
                    <button className="primary" style={{ width: "auto" }} onClick={() => openAddOperation()}>+ إضافة إجراء</button>
                  </div>

                  {operations.length === 0 && <div className="empty-state">لا يوجد إجراءات بهاي الخطة بعد</div>}

                  {operations.map((op) => {
                    const doctor = doctors.find((d) => d.id === op.doctor_id);
                    return (
                      <div key={op.id} className="list-item" style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {op.procedure_name} {op.procedure_code ? `(${op.procedure_code})` : ""}
                            </div>
                            <div className="subtitle" style={{ margin: 0 }}>
                              {CATEGORY_LABEL[op.category]}
                              {op.tooth_number ? ` · سن ${op.tooth_number}` : ""}
                              {op.tooth_surface ? ` · ${SURFACE_LABEL[op.tooth_surface]}` : ""}
                              {doctor ? ` · د. ${doctor.full_name}` : ""}
                              {" · أولوية "}{PRIORITY_LABEL[op.priority]}
                            </div>
                            <div className="subtitle" style={{ margin: 0 }}>
                              {op.cost_tbd || op.cost == null ? "التكلفة: تحدد لاحقاً" : `التكلفة: $${Number(op.cost).toFixed(2)}`}
                              {op.notes ? ` · ${op.notes}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={op.status} onChange={(e) => updateOperationStatus(op, e.target.value)}>
                              {Object.entries(OP_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <button className="secondary" style={{ width: "auto" }} onClick={() => openEditOperation(op)}>تعديل</button>
                            <button className="secondary" style={{ width: "auto" }} onClick={() => deleteOperation(op.id)}>حذف</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="card" style={{ marginTop: 16, background: "var(--bg-subtle, #f8f9fa)" }}>
                    <h4 style={{ margin: "0 0 8px" }}>الملخص المالي</h4>
                    <div>الإجمالي: ${totalCost.toFixed(2)} {hasTbd && "(+ بنود لم تحدد بعد)"}</div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {opModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
        }}>
          <div className="card" style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginTop: 0 }}>{editingOpId ? "تعديل إجراء" : "إضافة إجراء جديد"}</h3>

            <label>التصنيف</label>
            <select value={opForm.category} onChange={(e) => setOpForm({ ...opForm, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            <label style={{ marginTop: 8 }}>اسم الإجراء</label>
            <input value={opForm.procedure_name} onChange={(e) => setOpForm({ ...opForm, procedure_name: e.target.value })} placeholder="مثال: حشو أملغم" />

            <label style={{ marginTop: 8 }}>كود الإجراء (اختياري)</label>
            <input value={opForm.procedure_code} onChange={(e) => setOpForm({ ...opForm, procedure_code: e.target.value })} placeholder="مثال: D2140" />

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ marginTop: 8 }}>رقم السن</label>
                <input value={opForm.tooth_number} onChange={(e) => setOpForm({ ...opForm, tooth_number: e.target.value })} placeholder="مثال: 11" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ marginTop: 8 }}>السطح</label>
                <select value={opForm.tooth_surface} onChange={(e) => setOpForm({ ...opForm, tooth_surface: e.target.value })}>
                  <option value="">—</option>
                  {Object.entries(SURFACE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <label style={{ marginTop: 8 }}>الطبيب المسؤول</label>
            <select value={opForm.doctor_id} onChange={(e) => setOpForm({ ...opForm, doctor_id: e.target.value })}>
              <option value="">—</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ marginTop: 8 }}>الأولوية</label>
                <select value={opForm.priority} onChange={(e) => setOpForm({ ...opForm, priority: e.target.value })}>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ marginTop: 8 }}>الحالة</label>
                <select value={opForm.status} onChange={(e) => setOpForm({ ...opForm, status: e.target.value })}>
                  {Object.entries(OP_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>

            <label style={{ marginTop: 8 }}>التكلفة ($)</label>
            <input
              type="number" value={opForm.cost} disabled={opForm.cost_tbd}
              onChange={(e) => setOpForm({ ...opForm, cost: e.target.value })} placeholder="0.00"
            />
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontWeight: 400 }}>
              <input
                type="checkbox" checked={opForm.cost_tbd}
                onChange={(e) => setOpForm({ ...opForm, cost_tbd: e.target.checked })}
              />
              التكلفة تُحدد لاحقاً (TBD)
            </label>

            <label style={{ marginTop: 8 }}>ملاحظات</label>
            <input value={opForm.notes} onChange={(e) => setOpForm({ ...opForm, notes: e.target.value })} placeholder="اختياري" />

            {planError && <p className="error">{planError}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="secondary" style={{ width: "auto" }} onClick={() => setOpModalOpen(false)}>إلغاء</button>
              <button className="primary" style={{ width: "auto" }} onClick={saveOperation}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
