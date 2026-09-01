import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createAdminQuotationRevision } from "@/lib/repositories/quotations";
import { adminQuotationRevisionSchema } from "@/lib/validation/admin-quotations";
import { priceCustomBuiltUpNbrItem } from "@/lib/quotations/built-up-nbr-pricing";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminQuotationRevisionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the revised quotation." }, { status: 400 });
  try {
    const customItems = await Promise.all(parsed.data.customBuiltUpItems.map(({ overrideAmount, overrideReason, ...selection }) => priceCustomBuiltUpNbrItem(selection, { overrideAmount, overrideReason })));
    const quotation = await createAdminQuotationRevision((await params).id, {
      customer: parsed.data.customer,
      items: [...parsed.data.items, ...customItems],
      gstRate: parsed.data.gstRate,
      validUntil: parsed.data.validUntil || undefined,
      internalNotes: parsed.data.internalNotes,
      reason: parsed.data.reason,
    });
    return quotation ? NextResponse.json({ ok: true, quotation }) : NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the revised quotation." }, { status: 500 });
  }
}
