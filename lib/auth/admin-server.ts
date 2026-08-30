import "server-only";

import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyDevelopmentSession } from "@/lib/auth/development-session";

export type AdminRequestContext = { id: string; mode: IntegrationMode };

/** Verifies the sole Admin account before a protected route can use service access. */
export async function getAdminRequestContext(request: Request): Promise<AdminRequestContext | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const session = verifyDevelopmentSession(token, "admin");
    return session?.subjectId === "development-admin" ? { id: session.subjectId, mode } : null;
  }
  if (mode === "unconfigured") return null;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const client = getSupabaseServiceClient();
  if (!token || !client) return null;
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .eq("role", "admin")
    .eq("is_primary_admin", true)
    .maybeSingle();
  return profile ? { id: user.id, mode } : null;
}
