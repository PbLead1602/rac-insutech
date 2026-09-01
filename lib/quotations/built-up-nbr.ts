/**
 * Shared, deterministic geometry for sheet-built cylindrical insulation.
 *
 * This module deliberately contains no database access. The browser uses it
 * only for a live technical preview; server code supplies the approved sheet
 * rates and creates the commercial snapshot before a quotation is persisted.
 */

export const CUSTOM_BUILT_UP_NBR_ITEM_TYPE = "CUSTOM_BUILT_UP_NBR" as const;

export type BuiltUpNbrLayerInput = {
  variantId: string;
  thicknessMm: number;
  lamination: string;
  rate?: number;
};

export type BuiltUpNbrRequest = {
  materialClass: string;
  baseDiameterMm: number;
  pipeLengthM: number;
  requiredTotalThicknessMm: number;
  layers: BuiltUpNbrLayerInput[];
  wastagePercent: number;
};

/** Browser/API input: the server derives thickness, facing, rate and wastage. */
export type BuiltUpNbrSelection = {
  materialClass: string;
  baseDiameterMm: number;
  pipeLengthM: number;
  requiredTotalThicknessMm: number;
  layers: Array<{ variantId: string }>;
};

export type BuiltUpNbrLayerCalculation = {
  layerNumber: number;
  variantId: string;
  thicknessMm: number;
  lamination: string;
  innerDiameterMm: number;
  meanDiameterMm: number;
  outerDiameterMm: number;
  circumferenceM: number;
  netAreaM2: number;
  wastageAreaM2: number;
  quotedAreaM2: number;
  rate?: number;
  amount?: number;
};

export type BuiltUpNbrCalculation = {
  materialClass: string;
  baseDiameterMm: number;
  pipeLengthM: number;
  requiredTotalThicknessMm: number;
  configuredTotalThicknessMm: number;
  finishedOuterDiameterMm: number;
  wastagePercent: number;
  layers: BuiltUpNbrLayerCalculation[];
  totalNetAreaM2: number;
  totalQuotedAreaM2: number;
  basicAmount?: number;
  pricePerRunningMetre?: number;
};

export class BuiltUpNbrValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuiltUpNbrValidationError";
  }
}

const EPSILON = 0.000001;

function requireFiniteInRange(value: number, label: string, minimumExclusive: number, maximum: number) {
  if (!Number.isFinite(value) || value <= minimumExclusive || value > maximum) {
    throw new BuiltUpNbrValidationError(`${label} must be greater than ${minimumExclusive} and no more than ${maximum}.`);
  }
}

/** The supported range protects quotation endpoints from unrealistic input. */
export function calculateBuiltUpCylinderInsulation(input: BuiltUpNbrRequest): BuiltUpNbrCalculation {
  requireFiniteInRange(input.baseDiameterMm, "Pipe diameter", 0, 10000);
  requireFiniteInRange(input.pipeLengthM, "Pipe length", 0, 100000);
  requireFiniteInRange(input.requiredTotalThicknessMm, "Required total insulation thickness", 0, 1000);
  if (!Number.isFinite(input.wastagePercent) || input.wastagePercent < 0 || input.wastagePercent > 50) {
    throw new BuiltUpNbrValidationError("Wastage must be between 0% and 50%.");
  }
  if (!input.materialClass.trim()) throw new BuiltUpNbrValidationError("Choose a material class.");
  if (input.layers.length < 1 || input.layers.length > 5) throw new BuiltUpNbrValidationError("Configure between 1 and 5 insulation layers.");

  const configuredTotalThicknessMm = input.layers.reduce((total, layer) => {
    requireFiniteInRange(layer.thicknessMm, "Each layer thickness", 0, 500);
    if (!layer.variantId.trim()) throw new BuiltUpNbrValidationError("Choose a valid NBR Sheet configuration for every layer.");
    if (!layer.lamination.trim()) throw new BuiltUpNbrValidationError("Choose a facing for every layer.");
    if (layer.rate !== undefined && (!Number.isFinite(layer.rate) || layer.rate < 0)) throw new BuiltUpNbrValidationError("A layer rate is invalid.");
    return total + layer.thicknessMm;
  }, 0);
  const difference = input.requiredTotalThicknessMm - configuredTotalThicknessMm;
  if (Math.abs(difference) > EPSILON) {
    const configured = trimNumber(configuredTotalThicknessMm);
    const required = trimNumber(input.requiredTotalThicknessMm);
    if (difference > 0) {
      throw new BuiltUpNbrValidationError(`Configured thickness: ${configured} mm. Required thickness: ${required} mm. ${trimNumber(difference)} mm remaining.`);
    }
    throw new BuiltUpNbrValidationError(`Configured thickness exceeds the required total by ${trimNumber(Math.abs(difference))} mm.`);
  }

  let previousThicknessMm = 0;
  const layers = input.layers.map((layer, index) => {
    const innerDiameterMm = input.baseDiameterMm + (2 * previousThicknessMm);
    const meanDiameterMm = innerDiameterMm + layer.thicknessMm;
    const outerDiameterMm = innerDiameterMm + (2 * layer.thicknessMm);
    const circumferenceM = Math.PI * meanDiameterMm / 1000;
    const netAreaM2 = circumferenceM * input.pipeLengthM;
    const quotedAreaM2 = netAreaM2 * (1 + input.wastagePercent / 100);
    const wastageAreaM2 = quotedAreaM2 - netAreaM2;
    const amount = layer.rate === undefined ? undefined : roundMoney(quotedAreaM2 * layer.rate);
    previousThicknessMm += layer.thicknessMm;
    return {
      layerNumber: index + 1,
      variantId: layer.variantId,
      thicknessMm: layer.thicknessMm,
      lamination: layer.lamination,
      innerDiameterMm,
      meanDiameterMm,
      outerDiameterMm,
      circumferenceM,
      netAreaM2,
      wastageAreaM2,
      quotedAreaM2,
      rate: layer.rate,
      amount,
    };
  });
  const totalNetAreaM2 = layers.reduce((total, layer) => total + layer.netAreaM2, 0);
  const totalQuotedAreaM2 = layers.reduce((total, layer) => total + layer.quotedAreaM2, 0);
  const allLayersPriced = layers.every((layer) => layer.amount !== undefined);
  const basicAmount = allLayersPriced ? roundMoney(layers.reduce((total, layer) => total + (layer.amount || 0), 0)) : undefined;

  return {
    materialClass: input.materialClass,
    baseDiameterMm: input.baseDiameterMm,
    pipeLengthM: input.pipeLengthM,
    requiredTotalThicknessMm: input.requiredTotalThicknessMm,
    configuredTotalThicknessMm,
    finishedOuterDiameterMm: input.baseDiameterMm + (2 * input.requiredTotalThicknessMm),
    wastagePercent: input.wastagePercent,
    layers,
    totalNetAreaM2,
    totalQuotedAreaM2,
    basicAmount,
    pricePerRunningMetre: basicAmount === undefined ? undefined : basicAmount / input.pipeLengthM,
  };
}

export function thicknessMmFromRateCardLabel(value: string) {
  const match = /^\s*(\d+(?:\.\d+)?)\s*mm\b/i.exec(value);
  return match ? Number(match[1]) : Number.NaN;
}

export function trimNumber(value: number, decimals = 2) {
  return Number(value.toFixed(decimals)).toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

export function roundMoney(value: number) {
  return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}
