import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";

let serviceClient: SupabaseClient | null | undefined;

/**
 * Service client for trusted route handlers only. It deliberately returns null
 * when credentials are absent so development never silently calls a fake host.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (serviceClient !== undefined) return serviceClient;
  if (!serverEnv.supabaseServiceConfigured) {
    serviceClient = null;
    return serviceClient;
  }

  serviceClient = createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}
