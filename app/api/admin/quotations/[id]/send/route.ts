import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminQuotation, updateAdminQuotation } from "@/lib/repositories/quotations";
import { sendQuotationNotifications } from "@/lib/services/brevo";

// The notification service produces the attached PDF as a Node Buffer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-sends an already generated quotation to its customer and changes its
 * lifecycle state only after the transactional email provider accepts it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const detail = await getAdminQuotation((await params).id);
    if (!detail) return NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
    const email = await sendQuotationNotifications(detail.quotation);
    if (!email.delivered) {
      return NextResponse.json({ ok: false, message: email.error || "The quotation email could not be sent. Its current status has not changed." }, { status: 502 });
    }
    const quotation = await updateAdminQuotation(detail.quotation.id, { status: "sent" });
    return quotation
      ? NextResponse.json({ ok: true, quotation, notification: { emailDelivered: true, emailMode: email.mode } })
      : NextResponse.json({ ok: false, message: "Quotation could not be updated after email delivery." }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not send the quotation email." }, { status: 500 });
  }
}
