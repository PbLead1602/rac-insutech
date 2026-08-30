import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getCurrentQuotationRevisionRates } from "@/lib/repositories/quotations";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const rates = await getCurrentQuotationRevisionRates((await params).id);
    return rates ? NextResponse.json({ ok: true, rates }) : NextResponse.json({ ok: false, message: "Quotation not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load current Rate Card values." }, { status: 500 });
  }
}
