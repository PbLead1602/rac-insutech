import { NextResponse } from "next/server";
import { createDevelopmentSession, developmentAdminProfile, validDevelopmentAdminCredentials } from "@/lib/auth/development-session";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (integrationMode(serverEnv.supabaseServiceConfigured) !== "mock") return NextResponse.json({ ok: false, message: "Development Admin sign-in is unavailable when Supabase is configured." }, { status: 404 });
  const body = await request.json() as { email?: string; password?: string };
  if (!validDevelopmentAdminCredentials(String(body.email || ""), String(body.password || ""))) {
    return NextResponse.json({ ok: false, message: "Only the configured RAC Admin credentials can access the Admin panel." }, { status: 401 });
  }
  const profile = developmentAdminProfile();
  return NextResponse.json({ ok: true, profile, accessToken: createDevelopmentSession("admin", profile.id) });
}
