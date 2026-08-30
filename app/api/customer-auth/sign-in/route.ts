import { NextResponse } from "next/server";
import { getDevelopmentCustomerAccountByIdentity } from "@/lib/repositories/customer-accounts";
import { createDevelopmentSession } from "@/lib/auth/development-session";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (integrationMode(serverEnv.supabaseServiceConfigured) !== "mock") return NextResponse.json({ ok: false, message: "Development sign-in is unavailable when Supabase is configured." }, { status: 404 });
  const body = await request.json() as { identity?: string; password?: string };
  const identity = String(body.identity || "").trim();
  const password = String(body.password || "");
  if (!identity) return NextResponse.json({ ok: false, message: "Enter your email or mobile number." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, message: "Enter the password chosen during registration." }, { status: 400 });
  const account = await getDevelopmentCustomerAccountByIdentity(identity, password);
  if (!account) return NextResponse.json({ ok: false, message: "The email/mobile number or password is incorrect." }, { status: 401 });
  return NextResponse.json({ ok: true, account, accessToken: createDevelopmentSession("customer", account.id) });
}
