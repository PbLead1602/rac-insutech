import { NextResponse } from "next/server";
import { customerPortalReadFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { toCustomerQuotation, toCustomerRevisionRequest } from "@/lib/customer-portal/response";
import { customerQuoteStatus, getCustomerQuotation, listCustomerRevisionRequests } from "@/lib/repositories/customer-portal";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCustomerRequestContext(request); const failure = customerPortalReadFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  const quotation = await getCustomerQuotation(context!, (await params).id);
  if (!quotation) return NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  const revisions = (await listCustomerRevisionRequests(context!)).filter((item) => item.quotationId === quotation.id);
  return NextResponse.json({ ok: true, quotation: toCustomerQuotation(quotation), displayStatus: customerQuoteStatus(quotation.status), revisionRequests: revisions.map(toCustomerRevisionRequest) });
}
