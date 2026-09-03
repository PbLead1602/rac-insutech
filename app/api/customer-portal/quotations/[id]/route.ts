import { NextResponse } from "next/server";
import { customerPortalReadFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { toCustomerQuotation, toCustomerRevisionRequest } from "@/lib/customer-portal/response";
import { customerQuoteStatus, getCustomerQuotation, listCustomerRevisionRequests } from "@/lib/repositories/customer-portal";
import { updateAdminQuotation } from "@/lib/repositories/quotations";

export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCustomerRequestContext(request); const failure = customerPortalReadFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });
  let quotation = await getCustomerQuotation(context!, (await params).id);
  if (!quotation) return NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  // Opening a customer quotation is a real lifecycle event. Keep the Admin
  // and customer views aligned while preserving final commercial outcomes.
  // A generated quotation is still waiting for the owner to confirm sending
  // it by email. Previewing it must not skip that lifecycle step.
  if (["sent", "revised"].includes(quotation.status)) quotation = (await updateAdminQuotation(quotation.id, { status: "viewed" })) || quotation;
  const revisions = (await listCustomerRevisionRequests(context!)).filter((item) => item.quotationId === quotation.id);
  return NextResponse.json({ ok: true, quotation: toCustomerQuotation(quotation), displayStatus: customerQuoteStatus(quotation.status), revisionRequests: revisions.map(toCustomerRevisionRequest) });
}
