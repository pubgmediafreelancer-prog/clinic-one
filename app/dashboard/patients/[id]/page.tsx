import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PatientFileClient from "./patient-file-client";

export default async function PatientFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, exchange_rate")
    .eq("id", profile.clinic_id)
    .single();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, date_of_birth, blood_type, allergies, notes")
    .eq("id", id)
    .single();
  if (!patient) redirect("/dashboard");

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visited_at, diagnosis, notes, profiles(full_name)")
    .eq("patient_id", id)
    .order("visited_at", { ascending: false });

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, created_at, shared_with_patient")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, amount, paid_amount, status, currency, amount_usd_equiv, exchange_rate_used, created_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const invoiceIds = (invoices ?? []).map((i: any) => i.id);
  const { data: payments } = invoiceIds.length
    ? await supabase
        .from("payments")
        .select("id, invoice_id, amount, currency, method, exchange_rate_used, reference, paid_at")
        .in("invoice_id", invoiceIds)
        .order("paid_at", { ascending: false })
    : { data: [] as any[] };

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("id, issued_at, notes, profiles(full_name), prescription_items(id, drug_name_free_text, dosage, frequency, duration, instructions, drugs(name))")
    .eq("patient_id", id)
    .order("issued_at", { ascending: false });

  return (
    <PatientFileClient
      profile={profile as any}
      clinic={(clinic as any) ?? { exchange_rate: 89000 }}
      patient={patient as any}
      visits={(visits as any) ?? []}
      reports={(reports as any) ?? []}
      invoices={(invoices as any) ?? []}
      payments={(payments as any) ?? []}
      prescriptions={(prescriptions as any) ?? []}
    />
  );
}
