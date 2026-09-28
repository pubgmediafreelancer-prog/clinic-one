"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Someone lands here from an invite link the admin sent them (e.g.
// clinicone.app/invite/DOC-CODE-3). They just pick their own email/password;
// the signup trigger on the server does the actual clinic/role linking —
// this page never sends a clinic_id or role, only the invite code.
export default function InviteSignupPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { signup_type: "invite", invite_code: code, full_name: form.fullName },
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message.includes("invalid_or_expired_invite")
        ? "رابط الدعوة غير صالح أو منتهي، اطلب رابط جديد من الإدارة"
        : error.message);
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
          <div className="auth-brand-headline">دعوة انضمام لفريق العيادة</div>
          <p className="auth-brand-sub" style={{ marginTop: 16 }}>
            صار عندك حساب مرتبط بعيادتك ودورك، جاهز فوراً بعد التسجيل.
          </p>
        </div>
        <div />
      </aside>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="card">
            <div className="eyebrow">كود الدعوة: {code}</div>
            <h1>إتمام التسجيل</h1>
            <p className="subtitle">أنشئ حسابك للانضمام إلى فريق العيادة</p>
            <form onSubmit={handleSubmit}>
              <label>اسمك الكامل</label>
              <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

              <label>البريد الإلكتروني</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <label>كلمة المرور</label>
              <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              {error && <p className="error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "..." : "انضمام للعيادة"}</button>
            </form>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link href="/" className="link">← رجوع للصفحة الرئيسية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
