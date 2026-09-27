"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL: Record<string, string> = {
  wait: "بالانتظار", ok: "مؤكد", in: "بالعيادة", done: "انتهت", bad: "ملغى",
};

export default function DashboardClient({ profile, appointments, doctors, patients }: { profile: any; appointments: any[]; doctors: any[]; patients: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [inviteRole, setInviteRole] = useState("doctor");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [booking, setBooking] = useState({
    patientName: "", patientPhone: "", doctorId: doctors[0]?.id ?? "",
    date: "", time: "", visitType: "",
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingOk, setBookingOk] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function bookAppointment(e: React.FormEvent) {
    e.preventDefault();
    setBookingError(null);
    setBookingOk(null);
    setBookingLoading(true);

    // Find an existing patient at this clinic by phone, otherwise create one.
    let patientId: string | null = null;
    const { data: existing } = await supabase
      .from("patients")
      .select("id")
      .eq("phone", booking.patientPhone)
      .maybeSingle();

    if (existing) {
      patientId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("patients")
        .insert({
          clinic_id: profile.clinic_id,
          full_name: booking.patientName,
          phone: booking.patientPhone,
        })
        .select("id")
        .single();
      if (createErr) { setBookingError(createErr.message); setBookingLoading(false); return; }
      patientId = created.id;
    }

    const scheduledAt = new Date(`${booking.date}T${booking.time}`).toISOString();
    const { error: apptErr } = await supabase.from("appointments").insert({
      clinic_id: profile.clinic_id,
      patient_id: patientId,
      doctor_id: booking.doctorId || null,
      scheduled_at: scheduledAt,
      visit_type: booking.visitType || null,
    });

    setBookingLoading(false);
    if (apptErr) { setBookingError(apptErr.message); return; }
    setBookingOk("تم حجز الموعد بنجاح");
    setBooking({ ...booking, patientName: "", patientPhone: "", date: "", time: "", visitType: "" });
    router.refresh();
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

      <div className="card" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.1rem" }}>حجز موعد جديد</h1>
        <form onSubmit={bookAppointment}>
          <label>اسم المريض</label>
          <input required value={booking.patientName} onChange={(e) => setBooking({ ...booking, patientName: e.target.value })} />

          <label>هاتف المريض</label>
          <input required value={booking.patientPhone} onChange={(e) => setBooking({ ...booking, patientPhone: e.target.value })} placeholder="+9617xxxxxxx" />

          <label>الدكتور</label>
          <select value={booking.doctorId} onChange={(e) => setBooking({ ...booking, doctorId: e.target.value })}>
            <option value="">بدون تحديد</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>

          <label>تاريخ الموعد</label>
          <input required type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} />

          <label>وقت الموعد</label>
          <input required type="time" value={booking.time} onChange={(e) => setBooking({ ...booking, time: e.target.value })} />

          <label>نوع الزيارة</label>
          <input value={booking.visitType} onChange={(e) => setBooking({ ...booking, visitType: e.target.value })} placeholder="كشف، مراجعة..." />

          {bookingError && <p className="error">{bookingError}</p>}
          {bookingOk && <p className="subtitle" style={{ color: "green" }}>{bookingOk}</p>}
          <button className="primary" disabled={bookingLoading}>{bookingLoading ? "..." : "حجز الموعد"}</button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.1rem" }}>المواعيد</h1>
        {appointments.length === 0 && <p className="subtitle">لا يوجد مواعيد بعد</p>}
        {appointments.map((a) => (
          <a key={a.id} href={`/dashboard/patients/${a.patient_id}`} className="list-item row" style={{ textDecoration: "none", color: "inherit", display: "flex" }}>
            <div>
              <div>{a.patients?.full_name}</div>
              <div className="subtitle" style={{ margin: 0 }}>
                {new Date(a.scheduled_at).toLocaleString("ar-LB")} — {a.visit_type} — د. {a.profiles?.full_name ?? "—"}
              </div>
            </div>
            <span className="badge">{STATUS_LABEL[a.status] ?? a.status}</span>
          </a>
        ))}
      </div>

      <div className="card">
        <h1 style={{ fontSize: "1.1rem" }}>المرضى</h1>
        {patients.length === 0 && <p className="subtitle">لا يوجد مرضى بعد</p>}
        {patients.map((p) => (
          <a key={p.id} href={`/dashboard/patients/${p.id}`} className="list-item row" style={{ textDecoration: "none", color: "inherit", display: "flex" }}>
            <div>{p.full_name}</div>
            <span className="subtitle" style={{ margin: 0 }}>{p.phone}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
