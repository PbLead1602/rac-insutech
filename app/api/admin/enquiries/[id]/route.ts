import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminEnquiry, updateAdminEnquiry } from "@/lib/repositories/enquiries";
import { adminEnquiryPatchSchema } from "@/lib/validation/admin-enquiries";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const enquiry = await getAdminEnquiry((await params).id);
    return enquiry ? NextResponse.json({ ok: true, ...enquiry }) : NextResponse.json({ ok: false, message: "Enquiry not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the enquiry." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminEnquiryPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the enquiry update." }, { status: 400 });
  try {
    const enquiry = await updateAdminEnquiry((await params).id, parsed.data);
    return enquiry ? NextResponse.json({ ok: true, enquiry }) : NextResponse.json({ ok: false, message: "Enquiry not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the enquiry." }, { status: 500 });
  }
}
