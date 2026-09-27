"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL: Record<string, string> = {
  wait: "بالانتظار", ok: "مؤكد", in: "بالعيادة", done: "انتهت", bad: "ملغى",
};

export default function DashboardClient({ profile, appointments }: { profile: any; appointments: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [inviteRole, setInviteRole] = useState("doctor");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function createInvite() {
    setInviteError(null);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("invites").insert({
      clinic_id: profile.clinic_id,
      code,
      role: inviteRole,
    });
    if (error) { setInviteError(error.message); return; }
    setInviteCode(code);
  }

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="row">
        <div>
          <h1>{profile.clinics?.name ?? "العيادة"}</h1>
          <p className="subtitle">{profile.full_name} — <span className="badge">{profile.role}</span></p>
        </div>
        <button onClick={signOut} className="link" style={{ background: "none", border: "none", cursor: "pointer" }}>خروج</button>
      </div>

      {profile.role === "admin" && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: "1.1rem" }}>دعوة عضو جديد</h1>
          <label>الدور</label>
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="doctor">دكتور</option>
            <option value="secretary">سكرتيرة</option>
          </select>
          <button className="primary" onClick={createInvite}>إنشاء رابط دعوة</button>
          {inviteError && <p className="error">{inviteError}</p>}
          {inviteCode && (
            <p className="subtitle" style={{ marginTop: 12 }}>
              رابط الدعوة: <code>/invite/{inviteCode}</code> (صلاحيته 7 أيام)
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h1 style={{ fontSize: "1.1rem" }}>المواعيد</h1>
        {appointments.length === 0 && <p className="subtitle">لا يوجد مواعيد بعد</p>}
        {appointments.map((a) => (
          <div key={a.id} className="list-item row">
            <div>
              <div>{a.patients?.full_name}</div>
              <div className="subtitle" style={{ margin: 0 }}>
                {new Date(a.scheduled_at).toLocaleString("ar-LB")} — {a.visit_type} — د. {a.profiles?.full_name}
              </div>
            </div>
            <span className="badge">{STATUS_LABEL[a.status] ?? a.status}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
