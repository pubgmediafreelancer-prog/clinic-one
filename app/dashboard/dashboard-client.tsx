"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "مجدول", wait: "بالانتظار", ok: "مؤكد", in_consultation: "في الاستشارة",
  completed: "انتهت", cancelled: "ملغى", no_show: "لم يحضر",
};
const STATUS_BADGE_CLASS: Record<string, string> = {
  scheduled: "badge-info", wait: "badge-warn", ok: "badge-info", in_consultation: "badge-success",
  completed: "badge-muted", cancelled: "badge-danger", no_show: "badge-danger",
};
const QUEUE_STATUSES = ["wait", "in_consultation"];
const QUEUE_NEXT: Record<string, string> = { wait: "in_consultation", in_consultation: "completed" };
const QUEUE_NEXT_LABEL: Record<string, string> = { wait: "بدء الاستشارة", in_consultation: "إنهاء الاستشارة" };
const ROLE_LABEL: Record<string, string> = { admin: "إدارة", doctor: "دكتور", secretary: "سكرتيرة" };

const ALL_SPECIALTIES: { key: string; label: string; icon: string }[] = [
  { key: "dental", label: "الأسنان", icon: "🦷" },
  { key: "pediatrics", label: "الأطفال", icon: "👶" },
  { key: "dermatology", label: "الجلدية والتجميل", icon: "🧴" },
  { key: "obgyn", label: "النساء والولادة", icon: "🤰" },
];

export default function DashboardClient({ profile, appointments, doctors, patients, services }: { profile: any; appointments: any[]; doctors: any[]; patients: any[]; services: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const clinic = profile.clinics ?? {};
  const activeSpecialties: string[] = clinic.specialties ?? ["general"];

  const [specialtiesForm, setSpecialtiesForm] = useState<string[]>(activeSpecialties.filter((s) => s !== "general"));
  const [exchangeRateForm, setExchangeRateForm] = useState(String(clinic.exchange_rate ?? 89000));
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  function toggleSpecialty(key: string) {
    setSpecialtiesForm((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
  }

  async function saveSettings() {
    setSettingsSaving(true);
    setSettingsMsg(null);
    const { error } = await supabase.from("clinics").update({
      specialties: ["general", ...specialtiesForm],
      exchange_rate: Number(exchangeRateForm) || 89000,
    }).eq("id", clinic.id);
    setSettingsSaving(false);
    if (error) { setSettingsMsg(error.message); return; }
    setSettingsMsg("تم الحفظ بنجاح");
    router.refresh();
  }
  const [serviceForm, setServiceForm] = useState({ name: "", category: "", price: "", currency: "USD" });
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceBusyId, setServiceBusyId] = useState<string | null>(null);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setServiceError(null);
    setServiceLoading(true);
    const { error } = await supabase.from("services").insert({
      clinic_id: profile.clinic_id,
      name: serviceForm.name,
      category: serviceForm.category || null,
      price: Number(serviceForm.price) || 0,
      currency: serviceForm.currency,
    });
    setServiceLoading(false);
    if (error) { setServiceError(error.message); return; }
    setServiceForm({ name: "", category: "", price: "", currency: "USD" });
    router.refresh();
  }

  async function toggleServiceActive(id: string, active: boolean) {
    setServiceBusyId(id);
    await supabase.from("services").update({ active: !active }).eq("id", id);
    setServiceBusyId(null);
    router.refresh();
  }

  async function deleteService(id: string) {
    if (!confirm("حذف هذه الخدمة؟")) return;
    setServiceBusyId(id);
    await supabase.from("services").delete().eq("id", id);
    setServiceBusyId(null);
    router.refresh();
  }

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

  const [apptBusyId, setApptBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

  async function updateApptStatus(id: string, status: string) {
    setApptBusyId(id);
    await supabase.from("appointments").update({ status }).eq("id", id);
    setApptBusyId(null);
    router.refresh();
  }

  async function rescheduleAppt(id: string) {
    if (!rescheduleValue) return;
    setApptBusyId(id);
    await supabase.from("appointments").update({ scheduled_at: new Date(rescheduleValue).toISOString(), status: "scheduled" }).eq("id", id);
    setApptBusyId(null);
    setRescheduleId(null);
    setRescheduleValue("");
    router.refresh();
  }

  async function deleteAppt(id: string) {
    if (!confirm("حذف هذا الموعد؟")) return;
    setApptBusyId(id);
    await supabase.from("appointments").delete().eq("id", id);
    setApptBusyId(null);
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

  const todayStr = new Date().toDateString();
  const todaysCount = appointments.filter((a) => new Date(a.scheduled_at).toDateString() === todayStr).length;
  const pendingCount = appointments.filter((a) => a.status === "wait" || a.status === "ok").length;

  const [apptDoctorFilter, setApptDoctorFilter] = useState("");
  const [apptRangeFilter, setApptRangeFilter] = useState<"today" | "week" | "month" | "all">("all");

  function inRange(dateStr: string, range: typeof apptRangeFilter) {
    if (range === "all") return true;
    const d = new Date(dateStr);
    const now = new Date();
    if (range === "today") return d.toDateString() === now.toDateString();
    if (range === "week") {
      const diff = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diff >= -7 && diff <= 7;
    }
    if (range === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  }

  const filteredAppointments = appointments.filter((a) =>
    (!apptDoctorFilter || a.doctor_id === apptDoctorFilter) && inRange(a.scheduled_at, apptRangeFilter)
  );

  const [tab, setTabRaw] = useState<"overview" | "appointments" | "queue" | "patients" | "services" | "invite" | "settings">("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  function setTab(next: typeof tab) {
    setTabRaw(next);
    setMobileMenuOpen(false);
  }

  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.file_number ?? "").toLowerCase().includes(q) ||
        (p.id ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  })();

  const queueList = appointments
    .filter((a) => QUEUE_STATUSES.includes(a.status) && new Date(a.scheduled_at).toDateString() === todayStr)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-topbar">
          <div className="sidebar-brand">
            <span className="sidebar-brand-logo">🩺</span>
            كلينك ون
          </div>
          <button
            className="sidebar-menu-toggle"
            aria-label="فتح قائمة التنقل"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        <div className="sidebar-clinic">
          <div className="sidebar-clinic-name">{profile.clinics?.name ?? "العيادة"}</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 2 }}>{profile.full_name}</div>
          <span className="sidebar-clinic-role">{ROLE_LABEL[profile.role] ?? profile.role}</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`sidebar-link ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>📊 نظرة عامة</button>
          <button className={`sidebar-link ${tab === "appointments" ? "active" : ""}`} onClick={() => setTab("appointments")}>📅 المواعيد</button>
          <button className={`sidebar-link ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>⏱ غرفة الانتظار {queueList.length > 0 ? `(${queueList.length})` : ""}</button>
          <button className={`sidebar-link ${tab === "patients" ? "active" : ""}`} onClick={() => setTab("patients")}>🧑‍🤝‍🧑 المرضى</button>
          {activeSpecialties.includes("dental") && (
            <a className="sidebar-link" href="/dashboard/specialty/dental" onClick={() => setMobileMenuOpen(false)}>🦷 الأسنان</a>
          )}
          {activeSpecialties.includes("pediatrics") && (
            <a className="sidebar-link" href="/dashboard/specialty/pediatrics" onClick={() => setMobileMenuOpen(false)}>👶 الأطفال</a>
          )}
          {activeSpecialties.includes("dermatology") && (
            <a className="sidebar-link" href="/dashboard/specialty/dermatology" onClick={() => setMobileMenuOpen(false)}>🧴 الجلدية</a>
          )}
          {activeSpecialties.includes("obgyn") && (
            <a className="sidebar-link" href="/dashboard/specialty/obgyn" onClick={() => setMobileMenuOpen(false)}>🤰 النساء والولادة</a>
          )}
          {(profile.role === "admin" || profile.role === "secretary") && (
            <button className={`sidebar-link ${tab === "services" ? "active" : ""}`} onClick={() => setTab("services")}>💰 الخدمات والأسعار</button>
          )}
          {profile.role === "admin" && (
            <>
              <button className={`sidebar-link ${tab === "invite" ? "active" : ""}`} onClick={() => setTab("invite")}>➕ دعوة عضو</button>
              <button className={`sidebar-link ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>⚙️ إعدادات العيادة</button>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <button onClick={signOut} className="sidebar-signout">🚪 تسجيل الخروج</button>
        </div>
      </aside>
      {mobileMenuOpen && <div className="sidebar-scrim" onClick={() => setMobileMenuOpen(false)} />}

      <main className="app-main">
        <div className="page-head">
          <div className="eyebrow">لوحة التحكم</div>
          <h1>أهلاً، {profile.full_name.split(" ")[0]} 👋</h1>
          <p className="subtitle" style={{ margin: 0 }}>هذا ملخص عيادتك اليوم</p>
        </div>

        <div style={{ position: "relative", marginBottom: "var(--space-5)" }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 بحث عن مريض بالاسم، الهاتف، أو رقم الملف..."
            style={{ maxWidth: 420 }}
          />
          {searchQuery.trim() && (
            <div className="card" style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: "auto", width: 420,
              maxWidth: "calc(100vw - 32px)", zIndex: 50, padding: 8, maxHeight: 320, overflowY: "auto",
            }}>
              {searchResults.length === 0 && <div className="empty-state" style={{ padding: 12 }}>لا نتائج</div>}
              {searchResults.map((p) => (
                <a
                  key={p.id}
                  href={`/dashboard/patients/${p.id}`}
                  className="list-item"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                  <div className="subtitle" style={{ margin: 0 }}>
                    {p.phone}{p.file_number ? ` — ملف ${p.file_number}` : ""}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {tab === "overview" && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">مواعيد اليوم</div>
                <div className="stat-value">{todaysCount}</div>
                <div className="stat-sub">من إجمالي {appointments.length} موعد</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">مواعيد بانتظار التأكيد</div>
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-sub">تحتاج متابعة</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">إجمالي المرضى</div>
                <div className="stat-value">{patients.length}</div>
                <div className="stat-sub">مسجّلين بالعيادة</div>
              </div>
            </div>

            <div className="card">
              <div className="row" style={{ marginBottom: 8 }}>
                <h2 className="section-title">أحدث المواعيد</h2>
                <button className="btn-sm" onClick={() => setTab("appointments")}>عرض الكل ←</button>
              </div>
              {appointments.length === 0 && <div className="empty-state">لا يوجد مواعيد بعد</div>}
              {appointments.slice(0, 5).map((a) => (
                <div key={a.id} className="list-item row">
                  <a href={`/dashboard/patients/${a.patient_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ fontWeight: 600 }}>{a.patients?.full_name}</div>
                    <div className="subtitle" style={{ margin: 0 }}>
                      {new Date(a.scheduled_at).toLocaleString("ar-LB")} — {a.visit_type}
                    </div>
                  </a>
                  <span className={`badge ${STATUS_BADGE_CLASS[a.status]}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "appointments" && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>حجز موعد جديد</h2>
              <form onSubmit={bookAppointment}>
                <div className="grid-2">
                  <div>
                    <label>اسم المريض</label>
                    <input required value={booking.patientName} onChange={(e) => setBooking({ ...booking, patientName: e.target.value })} />
                  </div>
                  <div>
                    <label>هاتف المريض</label>
                    <input required value={booking.patientPhone} onChange={(e) => setBooking({ ...booking, patientPhone: e.target.value })} placeholder="+9617xxxxxxx" />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>الدكتور</label>
                    <select value={booking.doctorId} onChange={(e) => setBooking({ ...booking, doctorId: e.target.value })}>
                      <option value="">بدون تحديد</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>نوع الزيارة</label>
                    <input value={booking.visitType} onChange={(e) => setBooking({ ...booking, visitType: e.target.value })} placeholder="كشف، مراجعة..." />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label>تاريخ الموعد</label>
                    <input required type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} />
                  </div>
                  <div>
                    <label>وقت الموعد</label>
                    <input required type="time" value={booking.time} onChange={(e) => setBooking({ ...booking, time: e.target.value })} />
                  </div>
                </div>

                {bookingError && <p className="error">{bookingError}</p>}
                {bookingOk && <p className="success-msg">{bookingOk}</p>}
                <button className="primary" disabled={bookingLoading}>{bookingLoading ? "..." : "حجز الموعد"}</button>
              </form>
            </div>

            <div className="card">
              <div className="row" style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>كل المواعيد</h2>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select value={apptDoctorFilter} onChange={(e) => setApptDoctorFilter(e.target.value)} style={{ width: "auto" }}>
                    <option value="">كل الأطباء</option>
                    {doctors.map((d) => (<option key={d.id} value={d.id}>{d.full_name}</option>))}
                  </select>
                  <select value={apptRangeFilter} onChange={(e) => setApptRangeFilter(e.target.value as any)} style={{ width: "auto" }}>
                    <option value="all">كل الفترات</option>
                    <option value="today">اليوم</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                  </select>
                </div>
              </div>
              {filteredAppointments.length === 0 && <div className="empty-state">لا يوجد مواعيد مطابقة</div>}
              {filteredAppointments.map((a) => (
                <div key={a.id} className="list-item" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <a href={`/dashboard/patients/${a.patient_id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{a.patients?.full_name}</div>
                      <div className="subtitle" style={{ margin: 0 }}>
                        {new Date(a.scheduled_at).toLocaleString("ar-LB")} — {a.visit_type} — د. {a.profiles?.full_name ?? "—"}
                      </div>
                    </a>
                    <span className={`badge ${STATUS_BADGE_CLASS[a.status]}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.status === "scheduled" && (
                      <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "ok")}>✔ تأكيد</button>
                    )}
                    {(a.status === "scheduled" || a.status === "ok") && (
                      <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "wait")}>📥 تسجيل حضور</button>
                    )}
                    {a.status === "wait" && (
                      <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "in_consultation")}>🩺 بدء الاستشارة</button>
                    )}
                    {a.status === "in_consultation" && (
                      <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "completed")}>✅ إنهاء</button>
                    )}
                    {!["completed", "cancelled", "no_show"].includes(a.status) && (
                      <>
                        <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "no_show")}>🚫 لم يحضر</button>
                        <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => updateApptStatus(a.id, "cancelled")}>✕ إلغاء</button>
                        <button className="btn-sm" disabled={apptBusyId === a.id} onClick={() => { setRescheduleId(a.id); setRescheduleValue(""); }}>🔁 إعادة جدولة</button>
                      </>
                    )}
                    <select
                      value={a.status}
                      disabled={apptBusyId === a.id}
                      onChange={(e) => updateApptStatus(a.id, e.target.value)}
                      style={{ width: "auto" }}
                      className={STATUS_BADGE_CLASS[a.status]}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteAppt(a.id)}
                      disabled={apptBusyId === a.id}
                      className="btn-danger-sm"
                    >
                      حذف
                    </button>
                  </div>
                  {rescheduleId === a.id && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="datetime-local"
                        value={rescheduleValue}
                        onChange={(e) => setRescheduleValue(e.target.value)}
                        style={{ width: "auto" }}
                      />
                      <button className="primary" style={{ width: "auto", marginTop: 0 }} disabled={apptBusyId === a.id} onClick={() => rescheduleAppt(a.id)}>حفظ الموعد الجديد</button>
                      <button className="btn-danger-sm" onClick={() => setRescheduleId(null)}>إلغاء</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "queue" && (
          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              <h2 className="section-title">غرفة الانتظار اليوم</h2>
              <span className="subtitle" style={{ margin: 0 }}>{queueList.length} مريض بالطابور</span>
            </div>
            {queueList.length === 0 && <div className="empty-state">لا يوجد مرضى بغرفة الانتظار الآن</div>}
            {queueList.map((a, idx) => (
              <div key={a.id} className="list-item row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "var(--brand-500)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                <a href={`/dashboard/patients/${a.patient_id}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.patients?.full_name}</div>
                  <div className="subtitle" style={{ margin: 0 }}>
                    {new Date(a.scheduled_at).toLocaleTimeString("ar-LB")} — د. {a.profiles?.full_name ?? "—"}
                  </div>
                </a>
                <span className={`badge ${STATUS_BADGE_CLASS[a.status]}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                {QUEUE_NEXT[a.status] && (
                  <button
                    className="primary"
                    style={{ width: "auto", marginTop: 0, whiteSpace: "nowrap" }}
                    disabled={apptBusyId === a.id}
                    onClick={() => updateApptStatus(a.id, QUEUE_NEXT[a.status])}
                  >
                    {QUEUE_NEXT_LABEL[a.status]}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "patients" && (
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 8 }}>المرضى</h2>
            {patients.length === 0 && <div className="empty-state">لا يوجد مرضى بعد</div>}
            {patients.map((p) => (
              <a key={p.id} href={`/dashboard/patients/${p.id}`} className="list-item row" style={{ textDecoration: "none", color: "inherit", display: "flex" }}>
                <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                <span className="subtitle" style={{ margin: 0 }}>{p.phone}{p.file_number ? ` — ملف ${p.file_number}` : ""}</span>
              </a>
            ))}
          </div>
        )}

        {tab === "services" && (
          <>
            <div className="card mb-5">
              <h2 className="section-title" style={{ marginBottom: 12 }}>إضافة خدمة</h2>
              <form onSubmit={addService}>
                <div className="grid-2">
                  <div>
                    <label>اسم الخدمة</label>
                    <input required value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="مثال: كشف عام" />
                  </div>
                  <div>
                    <label>الفئة (اختياري)</label>
                    <input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} placeholder="مثال: أسنان" />
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label>السعر</label>
                    <input required type="number" min="0" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
                  </div>
                  <div>
                    <label>العملة</label>
                    <select value={serviceForm.currency} onChange={(e) => setServiceForm({ ...serviceForm, currency: e.target.value })}>
                      <option value="USD">دولار أمريكي ($)</option>
                      <option value="LBP">ليرة لبنانية (ل.ل)</option>
                    </select>
                  </div>
                </div>
                {serviceError && <p className="error">{serviceError}</p>}
                <button className="primary" disabled={serviceLoading}>{serviceLoading ? "..." : "إضافة خدمة"}</button>
              </form>
            </div>

            <div className="card">
              <h2 className="section-title" style={{ marginBottom: 8 }}>الخدمات والأسعار</h2>
              {services.length === 0 && <div className="empty-state">لا يوجد خدمات بعد</div>}
              {services.map((s) => (
                <div key={s.id} className="row list-item" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}{s.category ? ` (${s.category})` : ""}</div>
                    <div className="subtitle" style={{ margin: 0 }}>{s.price} {s.currency === "LBP" ? "ل.ل" : "$"}</div>
                  </div>
                  <span className={`badge ${s.active ? "badge-success" : "badge-muted"}`}>{s.active ? "مفعّلة" : "معطّلة"}</span>
                  <button className="btn-sm" disabled={serviceBusyId === s.id} onClick={() => toggleServiceActive(s.id, s.active)}>
                    {s.active ? "تعطيل" : "تفعيل"}
                  </button>
                  <button className="btn-danger-sm" disabled={serviceBusyId === s.id} onClick={() => deleteService(s.id)}>حذف</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "settings" && profile.role === "admin" && (
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 12 }}>إعدادات العيادة</h2>

            <label>سعر الصرف (ل.ل مقابل 1$)</label>
            <input type="number" min="0" value={exchangeRateForm} onChange={(e) => setExchangeRateForm(e.target.value)} />

            <label style={{ marginTop: 16, display: "block" }}>التخصصات المفعّلة</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
              {ALL_SPECIALTIES.map((s) => (
                <label key={s.key} className="badge" style={{
                  cursor: "pointer",
                  background: specialtiesForm.includes(s.key) ? "var(--brand-500)" : undefined,
                  color: specialtiesForm.includes(s.key) ? "#fff" : undefined,
                }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", marginInlineEnd: 6 }}
                    checked={specialtiesForm.includes(s.key)}
                    onChange={() => toggleSpecialty(s.key)}
                  />
                  {s.icon} {s.label}
                </label>
              ))}
            </div>

            {settingsMsg && <p className="success-msg" style={{ marginTop: 12 }}>{settingsMsg}</p>}
            <button className="primary" style={{ marginTop: 16, width: "auto" }} disabled={settingsSaving} onClick={saveSettings}>
              {settingsSaving ? "..." : "حفظ الإعدادات"}
            </button>
          </div>
        )}

        {tab === "invite" && profile.role === "admin" && (
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 12 }}>دعوة عضو جديد</h2>
            <label>الدور</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="doctor">دكتور</option>
              <option value="secretary">سكرتيرة</option>
            </select>
            <button className="primary" onClick={createInvite}>إنشاء رابط دعوة</button>
            {inviteError && <p className="error">{inviteError}</p>}
            {inviteCode && (
              <p className="success-msg">
                رابط الدعوة: <code>/invite/{inviteCode}</code> (صلاحيته 7 أيام)
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
