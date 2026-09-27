import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PediatricsClient from "./pediatrics-client";

export default async function PediatricsPage() {
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
    .select("id, full_name, date_of_birth")
    .eq("clinic_id", profile.clinic_id)
    .order("full_name", { ascending: true });

  return <PediatricsClient profile={profile as any} patients={(patients as any) ?? []} />;
}
