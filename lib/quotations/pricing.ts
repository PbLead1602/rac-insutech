import "server-only";

import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { calculateQuoteLine, getQuotationVariant, type CalculatedQuoteLine, type QuoteOrderUnit, type QuoteVariant } from "@/lib/quotations/catalogue";
import { getActiveRateCardForVariant } from "@/lib/repositories/rates";
import { normalizeRate } from "@/lib/rates/rate-precision";

/**
 * The browser uses the development catalogue only to constrain valid options.
 * In a configured environment, this function replaces its commercial values
 * with the approved row from quotation_rate_cards before any calculation.
 */
export async function getServerPricedVariant(variantId: string): Promise<QuoteVariant | undefined> {
  const developmentVariant = getQuotationVariant(variantId);
  if (!developmentVariant) return undefined;
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") return developmentVariant;
  const card = await getActiveRateCardForVariant(developmentVariant);
  if (!card) throw new Error("This product configuration does not have an approved active rate.");
  if (card.orderUnit !== developmentVariant.orderUnit) throw new Error("The approved rate card has an incompatible pricing unit.");
  return {
    ...developmentVariant,
    rate: normalizeRate(Number(card.rate)),
    rateUnit: card.rateUnit as QuoteVariant["rateUnit"],
    rollAreaM2: card.rollAreaM2,
    packRunningMetres: card.packRunningMetres,
  };
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
}): Promise<CalculatedQuoteLine> {
  const variant = await getServerPricedVariant(input.variantId);
  if (!variant) throw new Error("One selected product configuration is no longer available. Please configure it again.");

  const calculated = calculateQuoteLine(variant, input.quantity, input.orderUnit);
  if (input.rateOverride === undefined) return calculated;

  return {
    ...calculated,
    rate: normalizeRate(input.rateOverride),
    amount: Number((calculated.suppliedQuantity * normalizeRate(input.rateOverride)).toFixed(2)),
  };
}
