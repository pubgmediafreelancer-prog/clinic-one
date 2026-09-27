"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Patient login: phone number -> WhatsApp/SMS OTP -> verify -> land on /portal/records.
// Uses Supabase's phone-OTP auth (delivered via whichever SMS/WhatsApp provider
// is configured on the project — see Section 7 for wiring that provider up).
export default function PortalLogin() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (error) { setLoading(false); setError("الرمز غير صحيح"); return; }

    // First login after verification: attach this phone to the patient
    // record(s) the clinic already created for them.
    await supabase.rpc("link_patient_by_phone");
    setLoading(false);
    router.push("/portal/records");
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-mark">
          <span className="auth-brand-logo">🩺</span>
          كلينك ون
        </div>
        <div>
          <div className="auth-brand-headline">ملفك الطبي بين يديك</div>
          <p className="auth-brand-sub" style={{ marginTop: 16 }}>
            شوف تقاريرك وفواتيرك من أي وقت وأي مكان، بمجرد رقم هاتفك.
          </p>
        </div>
        <div />
      </aside>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="card">
            <div className="eyebrow">بوابة المريض</div>
            <h1>تسجيل الدخول</h1>
            <p className="subtitle">تسجيل الدخول برقم الهاتف</p>

            {step === "phone" ? (
              <form onSubmit={sendOtp}>
                <label>رقم الهاتف</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9617xxxxxxx" />
                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={loading}>{loading ? "..." : "إرسال رمز التحقق"}</button>
              </form>
            ) : (
              <form onSubmit={verifyOtp}>
                <label>رمز التحقق المرسل إلى {phone}</label>
                <input required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="1234" />
                {error && <p className="error">{error}</p>}
                <button className="primary" disabled={loading}>{loading ? "..." : "تأكيد"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
