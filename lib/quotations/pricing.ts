import "server-only";

import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getQuotationVariant, type QuoteVariant } from "@/lib/quotations/catalogue";
import { getActiveRateCardForVariant } from "@/lib/repositories/rates";

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
    rate: Number(card.rate),
    rateUnit: card.rateUnit as QuoteVariant["rateUnit"],
    rollAreaM2: card.rollAreaM2,
    packRunningMetres: card.packRunningMetres,
  };
}
