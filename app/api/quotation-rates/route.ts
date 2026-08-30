import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuotationVariant } from "@/lib/quotations/catalogue";
import { getActiveRateCardsForVariants } from "@/lib/repositories/rates";

export const dynamic = "force-dynamic";

const rateLookupSchema = z.object({
  variantIds: z.array(z.string().trim().min(1).max(160)).min(1).max(100),
});

/**
 * Returns the approved active Rate Card for the exact configurations visible
 * in the public quotation builder. Prices are still recalculated again when
 * the customer submits the quotation.
 */
export async function POST(request: Request) {
  const parsed = rateLookupSchema.safeParse(await request.json());
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
      return { variantId, rate: card.rate, rateUnit: card.rateUnit, available: true };
    });
    return NextResponse.json({ ok: true, rates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Could not load the active Rate Card values." }, { status: 500 });
  }
}
