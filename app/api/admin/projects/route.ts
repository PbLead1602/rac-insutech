import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createAdminProject, deleteAdminProjects, listAdminProjects } from "@/lib/repositories/projects";
import { adminProjectBulkDeleteSchema, adminProjectCreateSchema } from "@/lib/validation/admin-projects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try { return NextResponse.json({ ok: true, projects: await listAdminProjects(new URL(request.url).searchParams.get("q") || "") }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load projects." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminProjectBulkDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the selected projects." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...await deleteAdminProjects(parsed.data.ids) });
  } catch (error) {
    console.error("Admin project bulk deletion failed", { count: parsed.data.ids.length, message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, message: "Could not delete the selected projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminProjectCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the project details." }, { status: 400 });
  try { const result = await createAdminProject(parsed.data); return NextResponse.json({ ok: true, project: result.project }, { status: 201 }); } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the project." }, { status: 500 }); }
}
