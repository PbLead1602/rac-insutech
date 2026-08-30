import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { recordAdminActivity } from "@/lib/repositories/activity";
import { getAdminAccount, updateAdminAccount } from "@/lib/repositories/account";
import { adminAccountPatchSchema } from "@/lib/validation/admin-account";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { const profile = await getAdminAccount(context.id); return profile ? NextResponse.json({ ok: true, profile }) : NextResponse.json({ ok: false, message: "Admin profile not found." }, { status: 404 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the Admin profile." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminAccountPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the account name." }, { status: 400 });
  try { const profile = await updateAdminAccount(context.id, parsed.data.displayName); if (!profile) return NextResponse.json({ ok: false, message: "Admin profile not found." }, { status: 404 }); await recordAdminActivity({ action: "updated", entityType: "admin_account", entityId: profile.id, summary: "Updated the RAC Admin display name." }); return NextResponse.json({ ok: true, profile }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the Admin profile." }, { status: 500 }); }
}
