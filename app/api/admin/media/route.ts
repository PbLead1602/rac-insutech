import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { recordAdminActivity } from "@/lib/repositories/activity";
import { createAdminMedia, listAdminMedia } from "@/lib/repositories/media";
import { adminMediaCreateSchema } from "@/lib/validation/admin-media";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { return NextResponse.json({ ok: true, assets: await listAdminMedia(new URL(request.url).searchParams.get("q") || "") }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load media." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminMediaCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the asset details." }, { status: 400 });
  try { const result = await createAdminMedia(parsed.data); await recordAdminActivity({ action: "registered", entityType: "media", entityId: result.asset.id, summary: `Registered media asset: ${result.asset.fileName}` }); return NextResponse.json({ ok: true, asset: result.asset }, { status: 201 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not register media." }, { status: 500 }); }
}
