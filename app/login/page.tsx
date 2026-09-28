"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("بيانات الدخول غير صحيحة"); return; }
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
          <div className="auth-brand-headline">أهلاً بعودتك</div>
          <p className="auth-brand-sub" style={{ marginTop: 16 }}>
            سجّل دخولك لمتابعة مواعيدك، ملفات مرضاك، وفواتير عيادتك من مكان واحد.
          </p>
        </div>
        <div />
      </aside>

      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="card">
            <div className="eyebrow">طاقم العيادة</div>
            <h1>تسجيل الدخول</h1>
            <p className="subtitle">admin / دكتور / سكرتيرة</p>
            <form onSubmit={handleSubmit}>
              <label>البريد الإلكتروني</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@clinic.com" />
              <label>كلمة المرور</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              {error && <p className="error">{error}</p>}
              <button className="primary" disabled={loading}>{loading ? "..." : "دخول"}</button>
            </form>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link href="/signup" className="link">ما عندك عيادة؟ أنشئ حساب جديد ←</Link>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Link href="/" className="link">← رجوع للصفحة الرئيسية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
