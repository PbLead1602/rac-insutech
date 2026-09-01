import "server-only";

import type { CustomBuiltUpNbrSnapshot, QuotationLineRecord } from "@/lib/db/types";
import { calculateBuiltUpCylinderInsulation, CUSTOM_BUILT_UP_NBR_ITEM_TYPE, thicknessMmFromRateCardLabel, type BuiltUpNbrSelection } from "@/lib/quotations/built-up-nbr";
import { getServerPricedVariant } from "@/lib/quotations/pricing";
import { getBuiltUpNbrWastagePercent } from "@/lib/repositories/settings";

/**
 * Performs the authoritative custom NBR calculation. No browser-supplied
 * area, rate, amount, thickness or lamination is accepted as commercial data.
 */
export async function priceCustomBuiltUpNbrItem(selection: BuiltUpNbrSelection, options: { wastagePercent?: number; overrideAmount?: number; overrideReason?: string } = {}): Promise<QuotationLineRecord> {
  const materialClass = selection.materialClass.trim();
  if (!materialClass) throw new Error("Choose a material class for Custom Diameter / Built-Up NBR.");
  const wastagePercent = options.wastagePercent ?? await getBuiltUpNbrWastagePercent();

  const variants = await Promise.all(selection.layers.map(async ({ variantId }) => {
    const variant = await getServerPricedVariant(variantId);
    if (!variant) throw new Error("A selected NBR Sheet layer is no longer available.");
    if (variant.productId !== "nitrile-rubber-sheet") throw new Error("Custom built-up insulation must use an active Nitrile Rubber Sheet Rate Card.");
    if (variant.orderUnit !== "roll" || variant.rateUnit !== "square metre") throw new Error("The selected NBR Sheet Rate Card has an incompatible pricing unit.");
    if (variant.materialClass !== materialClass) throw new Error("Every built-up layer must use the selected material class.");
    const thicknessMm = thicknessMmFromRateCardLabel(variant.thickness);
    if (!Number.isFinite(thicknessMm)) throw new Error("The selected NBR Sheet Rate Card has an invalid thickness.");
    return { variant, thicknessMm };
  }));

  const calculation = calculateBuiltUpCylinderInsulation({
    materialClass,
    baseDiameterMm: selection.baseDiameterMm,
    pipeLengthM: selection.pipeLengthM,
    requiredTotalThicknessMm: selection.requiredTotalThicknessMm,
    wastagePercent,
    layers: variants.map(({ variant, thicknessMm }) => ({
      variantId: variant.id,
      thicknessMm,
      lamination: variant.lamination,
      rate: variant.rate,
    })),
  });
  if (calculation.basicAmount === undefined || calculation.pricePerRunningMetre === undefined) {
    throw new Error("Could not calculate the active NBR Sheet rates.");
  }

  const layers = calculation.layers.map((layer, index) => {
    const variant = variants[index].variant;
    if (layer.amount === undefined || layer.rate === undefined) throw new Error("Could not calculate a built-up NBR layer.");
    return {
      ...layer,
      sheetProductName: variant.productName,
      materialClass: variant.materialClass,
      rate: layer.rate,
      amount: layer.amount,
    };
  });
  const overrideAmount = options.overrideAmount;
  if (overrideAmount !== undefined && (!Number.isFinite(overrideAmount) || overrideAmount < 0)) throw new Error("The Admin override amount is invalid.");
  if (overrideAmount !== undefined && !options.overrideReason?.trim()) throw new Error("Enter an override reason when changing the calculated built-up NBR amount.");

  const snapshot: CustomBuiltUpNbrSnapshot = {
    itemType: CUSTOM_BUILT_UP_NBR_ITEM_TYPE,
    productNameSnapshot: "Custom Built-Up Nitrile Rubber Pipe Insulation",
    materialClassSnapshot: materialClass,
    baseDiameterMm: calculation.baseDiameterMm,
    pipeLengthM: calculation.pipeLengthM,
    requiredTotalThicknessMm: calculation.requiredTotalThicknessMm,
    configuredTotalThicknessMm: calculation.configuredTotalThicknessMm,
    finishedOuterDiameterMm: calculation.finishedOuterDiameterMm,
    wastagePercent: calculation.wastagePercent,
    totalNetAreaM2: calculation.totalNetAreaM2,
    totalQuotedAreaM2: calculation.totalQuotedAreaM2,
    calculatedBasicAmount: calculation.basicAmount,
    pricePerRunningMetre: calculation.pricePerRunningMetre,
    layers,
    ...(overrideAmount === undefined ? {} : { quotedOverrideAmount: Number(overrideAmount.toFixed(2)), overrideReason: options.overrideReason?.trim() }),
  };
  const amount = snapshot.quotedOverrideAmount ?? snapshot.calculatedBasicAmount;
  const rate = amount / calculation.pipeLengthM;
  const layerDescription = layers.map((layer) => `${layer.thicknessMm} mm ${layer.lamination}`).join(" + ");

  return {
    variantId: variants[0].variant.id,
    productName: snapshot.productNameSnapshot,
    configuration: `${materialClass} | ${calculation.baseDiameterMm} mm pipe | ${calculation.requiredTotalThicknessMm} mm total | ${layerDescription} | Finished OD ${calculation.finishedOuterDiameterMm} mm`,
    requestedQuantity: calculation.pipeLengthM,
    requestedUnit: "running_metre",
    suppliedQuantity: calculation.pipeLengthM,
    suppliedUnit: "running metres",
    technicalQuantity: `${calculation.pipeLengthM} running metres; ${layers.map((layer) => `L${layer.layerNumber}: ${layer.quotedAreaM2.toFixed(2)} m²`).join("; ")}`,
    rate,
    rateUnit: "per running metre (derived from NBR Sheet layers)",
    amount,
    provisional: true,
    itemType: CUSTOM_BUILT_UP_NBR_ITEM_TYPE,
    customBuiltUp: snapshot,
  };
}
