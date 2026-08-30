import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminProject, updateAdminProject } from "@/lib/repositories/projects";
import { adminProjectPatchSchema } from "@/lib/validation/admin-projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { const project = await getAdminProject((await params).id); return project ? NextResponse.json({ ok: true, ...project }) : NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the project." }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminProjectPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the project update." }, { status: 400 });
  try { const project = await updateAdminProject((await params).id, parsed.data); return project ? NextResponse.json({ ok: true, project }) : NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the project." }, { status: 500 }); }
}
