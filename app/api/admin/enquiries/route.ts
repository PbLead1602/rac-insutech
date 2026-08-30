import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createEnquiry, listAdminEnquiries } from "@/lib/repositories/enquiries";
import { adminEnquiryCreateSchema } from "@/lib/validation/admin-enquiries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const query = new URL(request.url).searchParams.get("q") || "";
    return NextResponse.json({ ok: true, enquiries: await listAdminEnquiries(query) });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load enquiries." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminEnquiryCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the enquiry details." }, { status: 400 });
  try {
    const result = await createEnquiry({ ...parsed.data, turnstileToken: "" });
    return NextResponse.json({ ok: true, enquiry: result.enquiry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the enquiry." }, { status: 500 });
  }
}
