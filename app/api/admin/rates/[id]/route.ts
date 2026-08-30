import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminRateCard, updateAdminRateCard } from "@/lib/repositories/rates";
import { adminRateCardPatchSchema } from "@/lib/validation/admin-rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { const result = await getAdminRateCard((await params).id); return result ? NextResponse.json({ ok: true, ...result }) : NextResponse.json({ ok: false, message: "Rate card not found." }, { status: 404 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the rate card." }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminRequestContext(request); if (!admin) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminRateCardPatchSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the rate-card update." }, { status: 400 });
  try { const rate = await updateAdminRateCard((await params).id, parsed.data, admin.mode === "live" ? admin.id : undefined); return rate ? NextResponse.json({ ok: true, rate }) : NextResponse.json({ ok: false, message: "Rate card not found." }, { status: 404 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the rate card." }, { status: 500 }); }
}
