import "server-only";

import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getCustomerContext, type CustomerAccountContext } from "@/lib/repositories/customer-accounts";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { verifyDevelopmentSession } from "@/lib/auth/development-session";

/** Verifies the caller and resolves their approval state server-side. */
export async function getCustomerRequestContext(request: Request): Promise<CustomerAccountContext | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (mode === "mock") {
    const session = verifyDevelopmentSession(token, "customer");
    return session ? getCustomerContext(session.subjectId) : null;
  }
  if (mode === "unconfigured") return null;
  const client = getSupabaseServiceClient(); if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return getCustomerContext(user.id, { email: user.email || "", emailVerified: Boolean(user.email_confirmed_at) });
}

export function customerAccessFailure(context: CustomerAccountContext | null) {
  if (!context) return { status: 401, message: "Please sign in to continue to quotation generation." };
  if (context.account.status === "pending_email_verification") return { status: 403, message: "Please verify your email before RAC can review your account." };
  if (context.account.status === "pending_admin_approval") return { status: 403, message: "Your RAC Insutech account is awaiting Admin approval." };
  if (context.account.status === "rejected") return { status: 403, message: "Quotation access is not available for this account." };
  if (context.account.status === "suspended" || context.account.status === "archived") return { status: 403, message: "This customer account is not currently authorised for quotation access." };
  if (!context.customer && context.mode !== "mock") return { status: 500, message: "Your approved customer profile could not be loaded. Please contact RAC." };
  return null;
}

/** Allows the read-only portion of the portal for pending and suspended accounts. */
export function customerPortalReadFailure(context: CustomerAccountContext | null) {
  if (!context) return { status: 401, message: "Please sign in to access your RAC account." };
  if (context.account.status === "rejected" || context.account.status === "archived") return { status: 403, message: "This account is not permitted to access the customer portal." };
  return null;
}
