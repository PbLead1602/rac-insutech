import type { QuotationRateCardRecord } from "@/lib/db/types";
import { normalizeRate } from "@/lib/rates/rate-precision";

/**
 * Rate Cards existed before the V2 catalogue used one consistent display
 * format. These helpers reconcile commercial identity instead of presentation
 * details such as whitespace, a multiplication glyph, or a supplier spelling.
 */
export type RateConfigurationIdentity = Pick<QuotationRateCardRecord,
  "productSlug" | "materialClass" | "thickness" | "sizeLabel" | "lamination" | "orderUnit" | "rateUnit"
>;

const malformedCharacterReplacements: Array<[RegExp, string]> = [
  [/\u00c3\u2014/g, "x"],
  [/\u00c2\u00b2/g, "2"],
  [/\u00e2\u20ac\u00a2/g, " "],
  [/\u00e2\u201a\u00b9/g, "₹"],
];

function repairedText(value: string | number | null | undefined) {
  return malformedCharacterReplacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), String(value ?? ""));
}

function decimal(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(Number(parsed.toFixed(6))) : "";
}

function canonicalWords(value: string | number | null | undefined) {
  return repairedText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u00d7/g, " x ")
    .replace(/[\u00b2]/g, "2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function canonicalProductSlug(value: string) {
  const key = canonicalWords(value);
  if (["nbr-sheet", "nitrile-sheet", "nitrile-rubber-sheet"].includes(key)) return "nitrile-rubber-sheet";
  if (["xlpe-sheet", "xlpe-sheet-insulation"].includes(key)) return "xlpe-sheet";
  if (["nbr-tube", "nitrile-tube", "nitrile-rubber-tube-class-o", "nitrile-rubber-tube-class-0"].includes(key)) return "nitrile-rubber-tube";
  if (["nbr-tube-class-1", "nitrile-rubber-tube-class-1"].includes(key)) return "nitrile-rubber-tube-class-1";
  return key;
}

export function canonicalMaterialClass(value: string) {
  const key = canonicalWords(value).replace(/-/g, "");
  // RAC's existing import-profile routing treats the supplier's Class 0
  // spelling as the established Class O product family.
  if (["classi", "class1"].includes(key)) return "class-i";
  if (["classo", "class0"].includes(key)) return "class-o";
  return key;
}

export function canonicalLamination(value: string) {
  const key = canonicalWords(value).replace(/-/g, "");
  if (["plain", "nolamination", "none", "unfaced"].includes(key)) return "plain";
  if (["alfoil", "alufoil", "aluminiumfoil", "aluminumfoil"].includes(key)) return "al-foil";
  if (["gccloth", "glasscloth"].includes(key)) return "gc-cloth";
  if (["metpet", "metpetfoil", "metalizedpet", "metallizedpet"].includes(key)) return "met-pet";
  return key;
}

export function canonicalThickness(value: string) {
  const source = repairedText(value).toLowerCase();
  const millimetres = source.match(/(-?\d+(?:\.\d+)?)\s*mm\b/);
  const numeric = source.trim().match(/^-?\d+(?:\.\d+)?$/);
  return millimetres ? `${decimal(millimetres[1])}mm` : numeric ? `${decimal(numeric[0])}mm` : canonicalWords(source);
}

function millimetres(value: string, unit: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const multiplier = unit.toLowerCase().startsWith("m") && !unit.toLowerCase().startsWith("mm") ? 1000 : unit.toLowerCase().startsWith("c") ? 10 : 1;
  return decimal(numeric * multiplier);
}

function sheetDimensions(value: string) {
  const source = repairedText(value).replace(/\u00d7/g, "x");
  const match = source.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i);
  if (!match) return "";
  const width = millimetres(match[1], match[2]);
  const length = millimetres(match[3], match[4]);
  return width && length ? `sheet-${width}mm-x-${length}mm` : "";
}

/** Sheet roll area is derived, so identity uses the normalized width × length. */
export function canonicalSizeLabel(value: string, productSlug: string) {
  const dimensions = sheetDimensions(value);
  if (dimensions && canonicalProductSlug(productSlug).includes("sheet")) return dimensions;
  return repairedText(value)
    .replace(/\u00d7/g, " x ")
    .replace(/(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/gi, (_match, quantity: string, unit: string) => {
      const asMillimetres = millimetres(quantity, unit);
      return asMillimetres ? ` ${asMillimetres}mm ` : _match;
    })
    .replace(/(\d+(?:\.\d+)?)\s*m(?:\u00b2|2)\b/gi, (_match, quantity: string) => ` ${decimal(quantity)}m2 `)
    .replace(/\bmetres?\b/gi, "m")
    .replace(/\bmeters?\b/gi, "m")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function canonicalOrderUnit(value: string) {
  const key = canonicalWords(value).replace(/-/g, "");
  if (["runningmetre", "runningmetres", "runningmeter", "runningmeters", "rm"].includes(key)) return "running-metre";
  if (["squaremetre", "squaremetres", "squaremeter", "squaremeters", "sqm", "m2"].includes(key)) return "square-metre";
  return key;
}

export function canonicalRateConfigurationKey(value: RateConfigurationIdentity) {
  return [
    canonicalProductSlug(value.productSlug),
    canonicalMaterialClass(value.materialClass),
    canonicalThickness(value.thickness),
    canonicalSizeLabel(value.sizeLabel, value.productSlug),
    canonicalLamination(value.lamination),
    canonicalOrderUnit(value.orderUnit),
    canonicalOrderUnit(value.rateUnit),
  ].join("|");
}

export function canonicalRateCardMatches<T extends RateConfigurationIdentity>(identity: RateConfigurationIdentity, cards: readonly T[]) {
  const key = canonicalRateConfigurationKey(identity);
  return cards.filter((card) => canonicalRateConfigurationKey(card) === key);
}

export function equalRateAmounts(left: number, right: number) {
  return Math.abs(Number(left) - Number(right)) < 0.00001;
}

export type CanonicalRateReconciliation<T extends RateConfigurationIdentity & { rate: number; active: boolean }> = {
  action: "create" | "update" | "unchanged" | "duplicate";
  matches: T[];
  existingRateCard?: T;
  reactivate?: boolean;
};

/** Classifies one controlled supplier mapping against the current Rate Cards. */
export function reconcileRateConfiguration<T extends RateConfigurationIdentity & { rate: number; active: boolean }>(mapping: RateConfigurationIdentity & { rate: number }, existing: readonly T[]): CanonicalRateReconciliation<T> {
  const matches = canonicalRateCardMatches(mapping, existing);
  if (!matches.length) return { action: "create", matches };
  if (matches.length > 1) return { action: "duplicate", matches };
  const existingRateCard = matches[0];
  if (equalRateAmounts(existingRateCard.rate, mapping.rate) && existingRateCard.active) return { action: "unchanged", matches, existingRateCard };
  return { action: "update", matches, existingRateCard, reactivate: !existingRateCard.active };
}

export function parseImportedRate(value: string | number | null | undefined) {
  const normalized = repairedText(value).replace(/[₹,\s]/g, "").replace(/^INR/i, "");
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? normalizeRate(Number(normalized)) : undefined;
}
