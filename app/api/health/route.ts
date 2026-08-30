import { NextResponse } from "next/server";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

/** Does not expose keys; useful for deployment monitors and setup verification. */
export function GET() {
  return NextResponse.json({
    ok: true,
    environment: serverEnv.NODE_ENV,
    integrations: {
      supabase: integrationMode(serverEnv.supabaseServiceConfigured),
      brevo: integrationMode(serverEnv.brevoConfigured),
      turnstile: integrationMode(serverEnv.turnstileConfigured),
    },
  });
}
