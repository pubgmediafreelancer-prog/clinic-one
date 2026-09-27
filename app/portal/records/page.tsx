import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecordsClient from "./records-client";

export default async function RecordsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal");

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, clinics(name)")
    .eq("auth_user_id", user.id);

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, created_at, file_path, patient_id")
    .eq("shared_with_patient", true)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, paid_amount, status, created_at, patient_id")
    .order("created_at", { ascending: false });

  return (
    <RecordsClient
      patients={(patients as any) ?? []}
      reports={(reports as any) ?? []}
      invoices={(invoices as any) ?? []}
    />
  );
}
