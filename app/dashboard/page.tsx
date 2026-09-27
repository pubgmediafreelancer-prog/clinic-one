import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, clinic_id, clinics(name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, visit_type, status, patients(full_name), profiles(full_name)")
    .order("scheduled_at", { ascending: true })
    .limit(50);

  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "doctor")
    .eq("clinic_id", profile.clinic_id);

  return (
    <DashboardClient
      profile={profile as any}
      appointments={(appointments as any) ?? []}
      doctors={(doctors as any) ?? []}
    />
  );
}
