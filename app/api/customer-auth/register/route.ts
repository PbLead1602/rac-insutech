import { NextResponse } from "next/server";
import { registerDevelopmentCustomer } from "@/lib/repositories/customer-accounts";
import { customerRegistrationSchema } from "@/lib/validation/customer-accounts";
import { createDevelopmentSession } from "@/lib/auth/development-session";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (integrationMode(serverEnv.supabaseServiceConfigured) !== "mock") return NextResponse.json({ ok: false, message: "Development registration is unavailable when Supabase is configured." }, { status: 404 });
  const parsed = customerRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Please check your registration details." }, { status: 400 });
  try { const account = await registerDevelopmentCustomer(parsed.data); return NextResponse.json({ ok: true, account, accessToken: createDevelopmentSession("customer", account.id) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create your account." }, { status: 400 }); }
}
