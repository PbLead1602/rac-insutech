import { createQuotationPdf } from "@/lib/quotations/pdf";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getAdminQuotation } from "@/lib/repositories/quotations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only PDF stream. The browser calls this with the authenticated Admin bearer token. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminRequestContext(request);
  if (!admin) return new Response("Authorised Admin access is required.", { status: 401 });

  const quotation = await getAdminQuotation((await params).id);
  if (!quotation) return new Response("Quotation not found.", { status: 404 });

  return new Response(await createQuotationPdf(quotation.quotation, new URL(request.url).origin), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quotation.quotation.quoteNumber.toLowerCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
