import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { quotationProducts, quotationVariants } from "@/lib/quotations/catalogue";
import { getActiveRateCardsForVariants } from "@/lib/repositories/rates";

export const dynamic = "force-dynamic";

/** Gives the sole Admin a current completeness check before publishing rates. */
export async function GET(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  try {
    const approvedCards = await getActiveRateCardsForVariants(quotationVariants);
    const products = quotationProducts.map((product) => {
      const variants = quotationVariants.filter((variant) => variant.productId === product.id);
      const missing = variants.filter((variant) => !approvedCards.has(variant.id));
      return {
        productId: product.id,
        productName: product.name,
        configurations: variants.length,
        approved: variants.length - missing.length,
        missing: missing.length,
        missingConfigurations: missing.map((variant) => `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`),
      };
    });
    const total = quotationVariants.length;
    const approved = [...approvedCards.keys()].length;
    return NextResponse.json({ ok: true, total, approved, missing: total - approved, products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not audit the Rate Cards." }, { status: 500 });
  }
}
