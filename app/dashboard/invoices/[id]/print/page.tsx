import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintClient from "./print-client";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, amount, paid_amount, status, currency, discount, tax_percent, created_at, patient_id, clinic_id, patients(full_name, phone), clinics(name, phone), invoice_items(id, description, quantity, unit_price)"
    )
    .eq("id", id)
    .single();

  if (!invoice) redirect("/dashboard");

  return <PrintClient invoice={invoice as any} />;
}
