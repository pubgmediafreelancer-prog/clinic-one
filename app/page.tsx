import Link from "next/link";

export default function Home() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-mark">
          <span className="auth-brand-logo">🩺</span>
          كلينك ون
        </div>
        <div>
          <div className="eyebrow" style={{ background: "rgba(255,255,255,0.12)", color: "#d8f5ee" }}>
            نظام إدارة عيادات سحابي
          </div>
          <div className="auth-brand-headline">
            كل عيادتك بمكان واحد — مواعيد، ملفات مرضى، وفوترة، بدون ورق وبدون تعقيد.
          </div>
          <p className="auth-brand-sub" style={{ marginTop: 16 }}>
            مبني خصيصاً لعيادات لبنان: تعدد المستخدمين، صلاحيات لكل دور، وبوابة خاصة لمرضاك.
          </p>
        </div>
        <div className="auth-brand-stats">
          <div className="auth-brand-stat"><b>3</b><span>أدوار: إدارة، دكتور، سكرتيرة</span></div>
          <div className="auth-brand-stat"><b>24/7</b><span>وصول سحابي من أي مكان</span></div>
          <div className="auth-brand-stat"><b>100%</b><span>عزل بيانات كل عيادة</span></div>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="card">
            <div className="eyebrow">ابدأ الآن</div>
            <h1>مرحباً بك في كلينك ون</h1>
            <p className="subtitle">نظام إدارة العيادات — مواعيد، ملف مريض، فوترة</p>

            <Link href="/login" style={{ textDecoration: "none" }}>
              <button className="primary">تسجيل الدخول (طاقم العيادة)</button>
            </Link>
            <Link href="/signup" style={{ textDecoration: "none" }}>
              <button className="secondary">إنشاء عيادة جديدة</button>
            </Link>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/portal" className="link">بوابة المريض ←</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
