import { normalizeRate } from "@/lib/rates/rate-precision";

export const TRANSPORT_AT_ACTUAL = "At Actual";

export type TransportMode = "at_actual" | "fixed";
export type TransportSelection = { mode: TransportMode; charge: number; label: string };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function validCharge(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? normalizeRate(value) : 0;
}

/** Converts the Admin's transport choice into the immutable quotation value. */
export function resolveTransport(mode: TransportMode = "at_actual", charge?: number): TransportSelection {
  if (mode !== "fixed") return { mode: "at_actual", charge: 0, label: TRANSPORT_AT_ACTUAL };
  const normalizedCharge = validCharge(charge);
  return { mode: "fixed", charge: normalizedCharge, label: currency.format(normalizedCharge) };
}

/** Reads transport wording saved by current and older quotation records. */
export function parseStoredTransport(value?: string | null): TransportSelection {
  const stored = value?.trim() || TRANSPORT_AT_ACTUAL;
  const match = /^₹\s*([\d,]+(?:\.\d{1,2})?)$/.exec(stored);
  if (!match) return { mode: "at_actual", charge: 0, label: TRANSPORT_AT_ACTUAL };
  return resolveTransport("fixed", Number(match[1].replaceAll(",", "")));
}
