import { NextResponse } from "next/server";
import { customerPortalReadFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { toCustomerEnquiry } from "@/lib/customer-portal/response";
import { getCustomerEnquiry } from "@/lib/repositories/customer-portal";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCustomerRequestContext(request); const failure = customerPortalReadFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  const enquiry = await getCustomerEnquiry(context!, (await params).id);
  if (!enquiry) return NextResponse.json({ ok: false, message: "Enquiry not found." }, { status: 404 });
  return NextResponse.json({ ok: true, enquiry: toCustomerEnquiry(enquiry) });
}
