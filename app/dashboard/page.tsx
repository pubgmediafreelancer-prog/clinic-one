import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, clinic_id, clinics(id, name, specialties, exchange_rate)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, visit_type, status, patient_id, doctor_id, patients(full_name), profiles(full_name)")
    .order("scheduled_at", { ascending: true })
    .limit(50);

  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "doctor")
    .eq("clinic_id", profile.clinic_id);

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, phone, file_number")
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: services } = await supabase
    .from("services")
    .select("id, name, category, price, currency, active")
    .eq("clinic_id", profile.clinic_id)
    .order("name");

  return (
    <DashboardClient
      profile={profile as any}
      appointments={(appointments as any) ?? []}
      doctors={(doctors as any) ?? []}
      patients={(patients as any) ?? []}
      services={(services as any) ?? []}
    />
  );
}
