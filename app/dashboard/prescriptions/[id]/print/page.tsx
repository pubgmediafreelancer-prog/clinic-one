import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintClient from "./print-client";

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rx } = await supabase
    .from("prescriptions")
    .select(
      "id, issued_at, notes, doctor_id, patient_id, clinic_id, profiles(full_name), patients(full_name, date_of_birth), clinics(name, phone), prescription_items(id, dosage, frequency, duration, instructions, drug_name_free_text, drugs(name, strength))"
    )
    .eq("id", id)
    .single();

  if (!rx) redirect("/dashboard");

  return <PrintClient rx={rx as any} />;
}
