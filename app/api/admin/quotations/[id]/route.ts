import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminQuotation, updateAdminQuotation } from "@/lib/repositories/quotations";
import { adminQuotationPatchSchema } from "@/lib/validation/admin-quotations";
import { convertAcceptedQuotationToProject } from "@/lib/repositories/sales-workflow";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const quotation = await getAdminQuotation((await params).id);
    return quotation ? NextResponse.json({ ok: true, ...quotation }) : NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the quotation." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminQuotationPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the quotation update." }, { status: 400 });
  try {
    const quotation = await updateAdminQuotation((await params).id, parsed.data);
    const finalQuotation = quotation && ["accepted", "po_received", "won"].includes(parsed.data.status || "")
      ? await convertAcceptedQuotationToProject(quotation)
      : quotation;
    return finalQuotation ? NextResponse.json({ ok: true, quotation: finalQuotation }) : NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not update the quotation." }, { status: 500 });
  }
}
