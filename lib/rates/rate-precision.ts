/**
 * Commercial rates are approved, entered and shown to two decimal places.
 * Amounts may still be calculated from the supplied quantity, then rounded
 * independently to two decimal places by the quotation services.
 */
export const RATE_DECIMAL_PLACES = 2;
const RATE_SCALE = 10 ** RATE_DECIMAL_PLACES;

export function normalizeRate(value: number) {
  if (!Number.isFinite(value)) return value;
  return Math.round((value + Number.EPSILON) * RATE_SCALE) / RATE_SCALE;
}

export function formatRateInput(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? ""
    : normalizeRate(value).toFixed(RATE_DECIMAL_PLACES);
}
