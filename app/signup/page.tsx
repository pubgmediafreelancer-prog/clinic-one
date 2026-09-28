"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clinicName: "", specialty: "", phone: "", fullName: "", email: "", password: "",
  });
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          signup_type: "new_clinic",
          clinic_name: form.clinicName,
          specialty: form.specialty,
          phone: form.phone,
          full_name: form.fullName,
        },
      },
    });

    setLoading(false);
    if (error) { setError(error.message); return; }

    // If the project requires email confirmation, Supabase returns a user
    // but no active session yet — going to /dashboard now would just bounce
    // back with "Email not confirmed". Show a clear instruction instead.
    if (data.user && !data.session) {
      setConfirmSent(true);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-mark">
          <span className="auth-brand-logo">🩺</span>
          كلينك ون
        </div>
        <div>
          <div className="auth-brand-headline">جهّز عيادتك للعمل بخمس دقائق</div>
          <p className="auth-brand-sub" style={{ marginTop: 16 }}>
            حساب admin كامل، دعوات لطاقمك، وملفات مرضى جاهزة من أول يوم.
          </p>
        </div>
        <div className="auth-brand-stats">
          <div className="auth-brand-stat"><b>5 د</b><span>وقت الإعداد</span></div>
          <div className="auth-brand-stat"><b>0$</b><span>بدون بطاقة للتجربة</span></div>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-form-wrap">
          {confirmSent ? (
            <div className="card">
              <div className="eyebrow">خطوة أخيرة</div>
              <h1>تحقق من إيميلك</h1>
              <p className="subtitle">
                بعتنالك رابط تأكيد على {form.email}. افتحي الإيميل وضغطي على الرابط،
                وبعدها رجعي سجلي دخول عادي.
              </p>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Link href="/" className="link">← رجوع للصفحة الرئيسية</Link>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="eyebrow">عيادة جديدة</div>
              <h1>إنشاء عيادة جديدة</h1>
              <p className="subtitle">بيصير حسابك admin على العيادة تلقائياً</p>
              <form onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div>
                    <label>اسم العيادة</label>
                    <input required value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
                  </div>
                  <div>
                    <label>التخصص</label>
                    <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="عام، أسنان، جلدية..." />
                  </div>
                </div>

                <label>هاتف العيادة</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+9617xxxxxxx" />

                <label>اسمك الكامل</label>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

                <label>البريد الإلكتروني</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

                <label>كلمة المرور</label>
                <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={loading}>{loading ? "..." : "إنشاء الحساب"}</button>
              </form>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Link href="/" className="link">← رجوع للصفحة الرئيسية</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
