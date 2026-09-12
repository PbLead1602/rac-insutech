import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext } from "@/lib/auth/admin-server";
import { getQuotationVariant, quotationProducts, quotationVariants } from "@/lib/quotations/catalogue";
import { getActiveRateCardsForVariants } from "@/lib/repositories/rates";
import { normalizeRate } from "@/lib/rates/rate-precision";

export const dynamic = "force-dynamic";

const activeRateLookupSchema = z.object({
  variantIds: z.array(z.string().trim().min(1).max(160)).min(1).max(100),
});

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

/**
 * Returns the active governed values for the Admin Manual Quotation preview.
 * Kept beside the Admin Rate Card audit API so this stays behind the same
 * Admin-only access boundary without exposing commercial cards publicly.
 */
export async function POST(request: Request) {
  if (!await getAdminRequestContext(request)) return NextResponse.json({ ok: false, message: "Authorised Admin access is required." }, { status: 401 });
  const parsed = activeRateLookupSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose at least one valid product configuration." }, { status: 400 });

  try {
    const variantIds = [...new Set(parsed.data.variantIds)];
    const variants = variantIds.flatMap((variantId) => {
      const variant = getQuotationVariant(variantId);
      return variant ? [variant] : [];
    });
    const cards = await getActiveRateCardsForVariants(variants);
    const rates = variantIds.map((variantId) => {
      const variant = getQuotationVariant(variantId);
      const card = cards.get(variantId);
      if (!variant) return { variantId, available: false, message: "This product configuration is not available." };
      if (!card) return { variantId, available: false, message: "No approved active Rate Card is available for this configuration." };
      if (card.orderUnit !== variant.orderUnit) return { variantId, available: false, message: "The approved Rate Card has an incompatible pricing unit." };
      return { variantId, rate: normalizeRate(card.rate), rateUnit: card.rateUnit, available: true };
    });
    return NextResponse.json({ ok: true, rates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load active Rate Card values." }, { status: 500 });
  }
}
