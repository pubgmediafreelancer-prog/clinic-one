"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const VIEW_LABEL: Record<string, string> = { front: "أمامي", back: "خلفي", left: "يسار", right: "يمين", face: "الوجه" };

export default function DermatologyClient({ profile, patients }: { profile: any; patients: any[] }) {
  const supabase = createClient();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [treatments, setTreatments] = useState<any[]>([]);
  const [photosByTreatment, setPhotosByTreatment] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState({ type: "", view: "front", x: "50", y: "50", notes: "" });
  const [photoForm, setPhotoForm] = useState<Record<string, { phase: string; url: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (patientId) load(patientId); }, [patientId]);

  async function load(pid: string) {
    setLoading(true);
    const { data: t } = await supabase.from("aesthetic_treatments").select("*").eq("patient_id", pid).order("performed_at", { ascending: false });
    setTreatments(t ?? []);
    const ids = (t ?? []).map((r: any) => r.id);
    if (ids.length) {
      const { data: photos } = await supabase.from("treatment_photos").select("*").in("treatment_id", ids).order("taken_at", { ascending: true });
      const map: Record<string, any[]> = {};
      for (const p of photos ?? []) (map[p.treatment_id] ??= []).push(p);
      setPhotosByTreatment(map);
    } else setPhotosByTreatment({});
    setLoading(false);
  }

  async function addTreatment() {
    if (!patientId || !form.type) return;
    await supabase.from("aesthetic_treatments").insert({
      patient_id: patientId,
      treatment_type: form.type,
      body_map_view: form.view,
      body_map_x: Number(form.x),
      body_map_y: Number(form.y),
      notes: form.notes || null,
    });
    setForm({ type: "", view: "front", x: "50", y: "50", notes: "" });
    load(patientId);
  }

  async function addPhoto(treatmentId: string) {
    const f = photoForm[treatmentId];
    if (!f?.url) return;
    await supabase.from("treatment_photos").insert({ treatment_id: treatmentId, phase: f.phase, file_path: f.url });
    setPhotoForm({ ...photoForm, [treatmentId]: { phase: f.phase, url: "" } });
    load(patientId);
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">قسم الجلدية والتجميل</div>
          <h1>خريطة الجسم ومقارنة الصور</h1>
          <a href="/dashboard" className="link">→ رجوع للداشبورد</a>
        </div>

        <div className="card mb-5">
          <label>اختر المريض</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        {!loading && patientId && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة علاج جديد على خريطة الجسم</h2>
              <div className="grid-2">
                <div><label>نوع العلاج</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="بوتوكس، فيلر، ليزر..." /></div>
                <div>
                  <label>منطقة الجسم</label>
                  <select value={form.view} onChange={(e) => setForm({ ...form, view: e.target.value })}>
                    {Object.entries(VIEW_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div><label>موضع X% (يسار→يمين)</label><input type="number" min="0" max="100" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} /></div>
                <div><label>موضع Y% (أعلى→أسفل)</label><input type="number" min="0" max="100" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} /></div>
              </div>
              <label>ملاحظات</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <button className="primary" style={{ marginTop: 10, width: "auto" }} onClick={addTreatment}>حفظ العلاج</button>
            </div>

            <div className="card">
              <h2 className="section-title" style={{ marginBottom: 8 }}>سجل العلاجات</h2>
              {treatments.length === 0 && <div className="empty-state">لا يوجد علاجات بعد</div>}
              {treatments.map((t) => {
                const photos = photosByTreatment[t.id] ?? [];
                const pre = photos.filter((p) => p.phase === "pre");
                const post = photos.filter((p) => p.phase === "post");
                return (
                  <div key={t.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{t.treatment_type} — {VIEW_LABEL[t.body_map_view] ?? t.body_map_view} ({t.body_map_x}%, {t.body_map_y}%)</div>
                    <div className="subtitle" style={{ margin: 0 }}>{new Date(t.performed_at).toLocaleDateString("ar-LB")}{t.notes ? ` — ${t.notes}` : ""}</div>

                    <div className="grid-2" style={{ marginTop: 10 }}>
                      <div>
                        <div className="subtitle" style={{ margin: 0, fontWeight: 600 }}>قبل ({pre.length})</div>
                        {pre.map((p) => <img key={p.id} src={p.file_path} alt="before" style={{ width: "100%", borderRadius: 8, marginTop: 4 }} />)}
                      </div>
                      <div>
                        <div className="subtitle" style={{ margin: 0, fontWeight: 600 }}>بعد ({post.length})</div>
                        {post.map((p) => <img key={p.id} src={p.file_path} alt="after" style={{ width: "100%", borderRadius: 8, marginTop: 4 }} />)}
                      </div>
                    </div>

                    <div className="row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <select
                        value={photoForm[t.id]?.phase ?? "pre"}
                        onChange={(e) => setPhotoForm({ ...photoForm, [t.id]: { phase: e.target.value, url: photoForm[t.id]?.url ?? "" } })}
                        style={{ width: "auto" }}
                      >
                        <option value="pre">قبل</option>
                        <option value="post">بعد</option>
                      </select>
                      <input
                        placeholder="رابط الصورة"
                        value={photoForm[t.id]?.url ?? ""}
                        onChange={(e) => setPhotoForm({ ...photoForm, [t.id]: { phase: photoForm[t.id]?.phase ?? "pre", url: e.target.value } })}
                        style={{ flex: 1 }}
                      />
                      <button className="btn-sm" onClick={() => addPhoto(t.id)}>إضافة صورة</button>
                    </div>
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
