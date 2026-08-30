import "server-only";

import type { AdminProfile } from "@/lib/db/types";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";
import { developmentAdminProfile } from "@/lib/auth/development-session";

function mockProfile() {
  return persistentDevelopmentStore("admin-profile", () => ({ profile: developmentAdminProfile() })).profile;
}

function toProfile(row: Record<string, unknown>): AdminProfile {
  return { id: String(row.id), email: String(row.email || ""), displayName: String(row.display_name || row.email || "RAC Admin"), role: "admin", isPrimaryAdmin: Boolean(row.is_primary_admin) };
}

export async function getAdminAccount(id: string): Promise<AdminProfile | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return mockProfile();
  if (mode === "unconfigured") throw new Error("Admin account storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("profiles").select("id,email,display_name,role,is_primary_admin").eq("id", id).eq("role", "admin").eq("is_primary_admin", true).maybeSingle();
  if (error) throw new Error("Could not load the Admin account.");
  return data ? toProfile(data as Record<string, unknown>) : null;
}

export async function updateAdminAccount(id: string, displayName: string): Promise<AdminProfile | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const store = persistentDevelopmentStore("admin-profile", () => ({ profile: developmentAdminProfile() }));
    store.profile = { ...mockProfile(), displayName };
    return store.profile;
  }
  if (mode === "unconfigured") throw new Error("Admin account storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("profiles").update({ display_name: displayName }).eq("id", id).eq("role", "admin").eq("is_primary_admin", true).select("id,email,display_name,role,is_primary_admin").maybeSingle();
  if (error) throw new Error("Could not update the Admin account.");
  return data ? toProfile(data as Record<string, unknown>) : null;
}
