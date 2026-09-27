import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <div className="card">
        <h1>كلينك ون</h1>
        <p className="subtitle">نظام إدارة العيادات — مواعيد، ملف مريض، فوترة</p>
        <Link href="/login"><button className="primary">تسجيل الدخول (طاقم العيادة)</button></Link>
        <div style={{ height: 12 }} />
        <Link href="/signup"><button className="primary" style={{ background: "#fff", color: "var(--accent)", border: "1px solid var(--border)" }}>إنشاء عيادة جديدة</button></Link>
        <div style={{ height: 12 }} />
        <Link href="/portal" className="link">بوابة المريض ←</Link>
      </div>
    </main>
  );
}
