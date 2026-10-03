import "server-only";

import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { calculateQuoteLine, getQuotationVariant, type CalculatedQuoteLine, type QuoteOrderUnit, type QuoteVariant } from "@/lib/quotations/catalogue";
import { getActiveRateCardsForVariants } from "@/lib/repositories/rates";
import { normalizeRate } from "@/lib/rates/rate-precision";

/**
 * The browser uses the development catalogue only to constrain valid options.
 * In a configured environment, this function replaces its commercial values
 * with the approved row from quotation_rate_cards before any calculation.
 */
export async function getServerPricedVariant(variantId: string): Promise<QuoteVariant | undefined> {
  const developmentVariant = getQuotationVariant(variantId);
  if (!developmentVariant) return undefined;
  return (await getServerPricedVariants([variantId])).get(variantId);
}

/**
 * Resolves every configuration required by one quotation from one governed
 * Rate Card snapshot. This preserves the same per-variant validation while
 * avoiding one database request per line in large quotations.
 */
export async function getServerPricedVariants(variantIds: readonly string[]): Promise<Map<string, QuoteVariant>> {
  const developmentVariants = [...new Map(
    variantIds
      .map((variantId) => getQuotationVariant(variantId))
      .filter((variant): variant is QuoteVariant => Boolean(variant))
      .map((variant) => [variant.id, variant]),
  ).values()];
  const results = new Map<string, QuoteVariant>();
  if (!developmentVariants.length) return results;

  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") {
    developmentVariants.forEach((variant) => results.set(variant.id, variant));
    return results;
  }

  const cards = await getActiveRateCardsForVariants(developmentVariants);
  for (const developmentVariant of developmentVariants) {
    const card = cards.get(developmentVariant.id);
    if (!card) throw new Error("This product configuration does not have an approved active rate.");
    if (card.orderUnit !== developmentVariant.orderUnit) throw new Error("The approved rate card has an incompatible pricing unit.");
    results.set(developmentVariant.id, {
      ...developmentVariant,
      rate: normalizeRate(Number(card.rate)),
      rateUnit: card.rateUnit as QuoteVariant["rateUnit"],
      rollAreaM2: card.rollAreaM2,
      packRunningMetres: card.packRunningMetres,
    });
  }
  return results;
}

/**
 * Prices a standard manual Admin quotation line from its active Rate Card.
 * The client never submits a catalogue price or calculated supply values. An
 * Admin may still make an intentional one-off override, but it is represented
 * separately and is recalculated against the governed supplied quantity.
 */
export async function priceAdminStandardQuotationLine(input: {
  variantId: string;
  quantity: number;
  orderUnit: QuoteOrderUnit;
  rateOverride?: number;
}, pricedVariants?: ReadonlyMap<string, QuoteVariant>): Promise<CalculatedQuoteLine> {
  const variant = pricedVariants?.get(input.variantId) ?? await getServerPricedVariant(input.variantId);
  if (!variant) throw new Error("One selected product configuration is no longer available. Please configure it again.");

  const calculated = calculateQuoteLine(variant, input.quantity, input.orderUnit);
  if (input.rateOverride === undefined) return calculated;

  return {
    ...calculated,
    rate: normalizeRate(input.rateOverride),
    amount: Number((calculated.suppliedQuantity * normalizeRate(input.rateOverride)).toFixed(2)),
  };
}

/** Prices an Admin quotation's standard lines from one active-rate snapshot. */
export async function priceAdminStandardQuotationLines(inputs: Array<{
  variantId: string;
  quantity: number;
  orderUnit: QuoteOrderUnit;
  rateOverride?: number;
}>, pricedVariants?: ReadonlyMap<string, QuoteVariant>): Promise<CalculatedQuoteLine[]> {
  const rateSnapshot = pricedVariants ?? await getServerPricedVariants(inputs.map((input) => input.variantId));
  return Promise.all(inputs.map((input) => priceAdminStandardQuotationLine(input, rateSnapshot)));
}

/** Applies an Admin's one-off commercial discount after active Rate Card pricing. */
export function applyAdminQuotationDiscount(lines: CalculatedQuoteLine[], discountPercent = 0): CalculatedQuoteLine[] {
  const discount = Number.isFinite(discountPercent) ? Math.min(100, Math.max(0, discountPercent)) : 0;
  if (discount === 0) return lines;
  const multiplier = 1 - discount / 100;
  return lines.map((line) => {
    const rate = normalizeRate(line.rate * multiplier);
    return { ...line, rate, amount: Number((line.suppliedQuantity * rate).toFixed(2)) };
  });
}
