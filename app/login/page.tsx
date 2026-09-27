"use client";
import { useState } from "react";
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
    <main className="page">
      <div className="card">
        <h1>تسجيل الدخول</h1>
        <p className="subtitle">لطاقم العيادة (admin / دكتور / سكرتيرة)</p>
        <form onSubmit={handleSubmit}>
          <label>البريد الإلكتروني</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>كلمة المرور</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={loading}>{loading ? "..." : "دخول"}</button>
        </form>
      </div>
    </main>
  );
}
