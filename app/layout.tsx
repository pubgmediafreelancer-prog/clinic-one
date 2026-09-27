import "./globals.css";

export const metadata = { title: "كلينك ون — Clinic One", description: "نظام إدارة العيادات الشامل" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
