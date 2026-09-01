"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

type PortalAudience = "admin" | "customer";

const browserClients: Record<PortalAudience, SupabaseClient | null | undefined> = {
  admin: undefined,
  customer: undefined,
};

function browserClientFor(audience: PortalAudience): SupabaseClient | null {
  const existing = browserClients[audience];
  if (existing !== undefined) return existing;
  if (!env.supabasePublicConfigured) {
    browserClients[audience] = null;
    return null;
  }

  // Admin and Customer access are different roles. Keeping their sessions in
  // distinct browser stores means a customer sign-in can never replace an
  // Admin session in another tab of the same browser.
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: `rac-insutech-${audience}-auth`,
      },
    },
  );
  browserClients[audience] = client;
  return client;
}

/** Returns the isolated browser session used by the Customer Portal. */
export function getCustomerSupabaseBrowserClient(): SupabaseClient | null {
  return browserClientFor("customer");
}

/** Returns the isolated browser session used by the sole RAC Admin portal. */
export function getAdminSupabaseBrowserClient(): SupabaseClient | null {
  return browserClientFor("admin");
}

/**
 * Backward-compatible Customer Portal alias. New Admin code must use
 * getAdminSupabaseBrowserClient explicitly.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  return getCustomerSupabaseBrowserClient();
}
