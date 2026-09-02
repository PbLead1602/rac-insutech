import { createQuotationPdf } from "@/lib/quotations/pdf";
import { customerAccessFailure, getCustomerRequestContext } from "@/lib/auth/customer-server";
import { getCustomerQuotation } from "@/lib/repositories/customer-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const context = await getCustomerRequestContext(request);
  const failure = customerAccessFailure(context);
  if (failure) return new Response(failure.message, { status: failure.status });
  const quotation = await getCustomerQuotation(context!, quoteId);
  if (!quotation) return new Response("Quotation not found.", { status: 404 });
  return new Response(await createQuotationPdf(quotation, new URL(request.url).origin), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotation.quoteNumber.toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
