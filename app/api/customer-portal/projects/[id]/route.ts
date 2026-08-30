import { NextResponse } from "next/server";
import { customerPortalReadFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { getCustomerProject } from "@/lib/repositories/customer-portal";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { const context = await getCustomerRequestContext(request); const failure = customerPortalReadFailure(context); if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status }); const detail = await getCustomerProject(context!, (await params).id); if (!detail) return NextResponse.json({ ok: false, message: "Project not found." }, { status: 404 }); return NextResponse.json({ ok: true, project: { ...detail.project, internalNotes: undefined }, linked: detail.linked }); }
