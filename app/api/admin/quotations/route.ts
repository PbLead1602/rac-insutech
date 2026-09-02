import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createAdminQuotation, listAdminQuotations, updateAdminQuotation } from "@/lib/repositories/quotations";
import { adminQuotationCreateSchema } from "@/lib/validation/admin-quotations";
import { finaliseQuotationSalesLinks, resolveSalesLinks } from "@/lib/repositories/sales-workflow";
import { priceCustomBuiltUpNbrItem } from "@/lib/quotations/built-up-nbr-pricing";
import { sendQuotationNotifications } from "@/lib/services/brevo";

// Quotation email delivery creates PDF attachments and must use the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const quotations = await listAdminQuotations(new URL(request.url).searchParams.get("q") || "");
    return NextResponse.json({ ok: true, quotations });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load quotations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminQuotationCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the quotation details." }, { status: 400 });
  try {
    const salesLinks = await resolveSalesLinks(parsed.data.customer, { enquiryId: parsed.data.enquiryId });
    const customItems = await Promise.all(parsed.data.customBuiltUpItems.map(({ overrideAmount, overrideReason, ...selection }) => priceCustomBuiltUpNbrItem(selection, { overrideAmount, overrideReason })));
    const created = await createAdminQuotation({
      customer: parsed.data.customer,
      items: [...parsed.data.items, ...customItems],
      gstRate: parsed.data.gstRate,
      enquiryId: parsed.data.enquiryId,
      validUntil: parsed.data.validUntil || undefined,
      internalNotes: parsed.data.internalNotes,
      ...salesLinks,
    });
    let quotation = await finaliseQuotationSalesLinks(created.quotation, salesLinks);
    const email = await sendQuotationNotifications(quotation);
    if (email.delivered) quotation = (await updateAdminQuotation(quotation.id, { status: "sent" })) || quotation;
    return NextResponse.json({ ok: true, quotation, notification: { emailDelivered: email.delivered, emailMode: email.mode } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the quotation." }, { status: 500 });
  }
}
