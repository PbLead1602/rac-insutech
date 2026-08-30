import { NextResponse } from "next/server";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { toCustomerEnquiry, toCustomerQuotationSummary, toCustomerRevisionRequest } from "@/lib/customer-portal/response";
import { portalDataForAccount } from "@/lib/repositories/customer-accounts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await getCustomerRequestContext(request);
    if (!context) return NextResponse.json({ ok: false, message: "Please sign in to continue." }, { status: 401 });
    const portal = await portalDataForAccount(context);
    return NextResponse.json({
      ok: true,
      account: portal.account,
      customer: portal.customer,
      enquiries: portal.enquiries.map(toCustomerEnquiry),
      quotations: portal.quotations.map(toCustomerQuotationSummary),
      projects: portal.projects.map(({ internalNotes, ...project }) => project),
      documents: portal.documents,
      revisionRequests: portal.revisionRequests.map(toCustomerRevisionRequest),
      access: customerAccessFailure(context) ? "restricted" : "allowed",
    });
  } catch (error) { return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load your account." }, { status: 500 }); }
}
