import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { recordAdminActivity } from "@/lib/repositories/activity";
import { permanentlyDeleteAdminMedia, updateAdminMedia } from "@/lib/repositories/media";
import { adminMediaPatchSchema } from "@/lib/validation/admin-media";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminMediaPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the asset update." }, { status: 400 });
  try { const asset = await updateAdminMedia((await params).id, parsed.data); if (!asset) return NextResponse.json({ ok: false, message: "Media asset not found." }, { status: 404 }); await recordAdminActivity({ action: parsed.data.archived ? "archived" : "updated", entityType: "media", entityId: asset.id, summary: `${parsed.data.archived ? "Archived" : "Updated"} media asset: ${asset.fileName}` }); return NextResponse.json({ ok: true, asset }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update media." }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const id = (await params).id;
    const deleted = await permanentlyDeleteAdminMedia(id);
    if (deleted) await recordAdminActivity({ action: "deleted", entityType: "media", entityId: id, summary: "Permanently deleted archived media asset record." });
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "Only an archived media asset can be permanently deleted." }, { status: 409 });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not permanently delete media." }, { status: 500 }); }
}
