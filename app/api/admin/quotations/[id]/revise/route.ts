import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { createAdminQuotationRevision } from "@/lib/repositories/quotations";
import { adminQuotationRevisionSchema } from "@/lib/validation/admin-quotations";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = adminQuotationRevisionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message || "Check the revised quotation." }, { status: 400 });
  try {
    const quotation = await createAdminQuotationRevision((await params).id, parsed.data);
    return quotation ? NextResponse.json({ ok: true, quotation }) : NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not create the revised quotation." }, { status: 500 });
  }
}
