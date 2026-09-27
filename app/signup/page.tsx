"use client";
import { useState } from "react";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
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
    router.push("/dashboard");
  }

  return (
    <main className="page">
      <div className="card">
        <h1>إنشاء عيادة جديدة</h1>
        <p className="subtitle">بيصير حسابك admin على العيادة تلقائياً</p>
        <form onSubmit={handleSubmit}>
          <label>اسم العيادة</label>
          <input required value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />

          <label>التخصص</label>
          <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="عام، أسنان، جلدية..." />

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
      </div>
    </main>
  );
}
