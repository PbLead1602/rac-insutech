import { NextResponse } from "next/server";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { getCustomerQuotation } from "@/lib/repositories/customer-portal";
import { updateAdminQuotation } from "@/lib/repositories/quotations";
import { markQuotationSalesEmailSent } from "@/lib/repositories/sales-workflow";
import { sendQuotationNotifications } from "@/lib/services/brevo";

// PDF attachment generation is a Node-side operation.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a generated quotation only at the request of its signed-in owner.
 * The ownership lookup prevents an access token or browser URL from emailing
 * another customer's quotation.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCustomerRequestContext(request);
  const failure = customerAccessFailure(context);
  if (failure) return NextResponse.json({ ok: false, message: failure.message }, { status: failure.status });

  try {
    const quotation = await getCustomerQuotation(context!, (await params).id);
    if (!quotation) return NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });

    const email = await sendQuotationNotifications(quotation);
    if (!email.delivered) {
      return NextResponse.json({ ok: false, message: email.error || "The quotation email could not be sent. Its status has not changed." }, { status: 502 });
    }
    const sentQuotation = await updateAdminQuotation(quotation.id, { status: "sent" });
    if (!sentQuotation) return NextResponse.json({ ok: false, message: "Quotation email was accepted, but the sent status could not be saved." }, { status: 500 });
    await markQuotationSalesEmailSent(sentQuotation);
    return NextResponse.json({ ok: true, quotation: { id: sentQuotation.id, status: sentQuotation.status, lastSentAt: sentQuotation.lastSentAt }, notification: { emailDelivered: true, emailMode: email.mode } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not send the quotation email." }, { status: 500 });
  }
}
