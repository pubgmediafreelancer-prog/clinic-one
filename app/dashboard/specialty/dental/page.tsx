import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DentalClient from "./dental-client";

export default async function DentalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, clinic_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, phone, date_of_birth")
    .eq("clinic_id", profile.clinic_id)
    .order("full_name", { ascending: true });

  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("clinic_id", profile.clinic_id)
    .eq("role", "doctor")
    .order("full_name", { ascending: true });

  return (
    <DentalClient
      profile={profile as any}
      patients={(patients as any) ?? []}
      doctors={(doctors as any) ?? []}
    />
  );
}
