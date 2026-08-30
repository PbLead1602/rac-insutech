import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { RateCardConflictError, createAdminRateCard, listAdminRateCards, quotationRateOptions } from "@/lib/repositories/rates";
import { adminRateCardCreateSchema } from "@/lib/validation/admin-rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { return NextResponse.json({ ok: true, rates: await listAdminRateCards(new URL(request.url).searchParams.get("q") || ""), options: quotationRateOptions() }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load rate cards." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminRateCardCreateSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the rate-card details." }, { status: 400 });
  try { const result = await createAdminRateCard(parsed.data); return NextResponse.json({ ok: true, rate: result.card }, { status: 201 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the rate card." }, { status: error instanceof RateCardConflictError ? 409 : 500 }); }
}
