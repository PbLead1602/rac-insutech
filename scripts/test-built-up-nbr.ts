import assert from "node:assert/strict";
import { calculateBuiltUpCylinderInsulation, BuiltUpNbrValidationError } from "../lib/quotations/built-up-nbr";
import { quotationVariants } from "../lib/quotations/catalogue";

const near = (actual: number, expected: number, tolerance = 0.0002) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
};
const plain25 = quotationVariants.find((variant) => variant.productId === "nitrile-rubber-sheet" && variant.materialClass === "Class O" && variant.thickness.startsWith("25 mm") && variant.lamination === "Plain");
const foil25 = quotationVariants.find((variant) => variant.productId === "nitrile-rubber-sheet" && variant.materialClass === "Class O" && variant.thickness.startsWith("25 mm") && variant.lamination === "AL foil");
assert.ok(plain25 && foil25, "The test requires active Class O 25 mm NBR Sheet catalogue variants.");

const twoLayerBase = {
  materialClass: "Class O",
  baseDiameterMm: 200,
  pipeLengthM: 10,
  requiredTotalThicknessMm: 50,
  layers: [
    { variantId: plain25.id, thicknessMm: 25, lamination: "Plain", rate: plain25.rate },
    { variantId: foil25.id, thicknessMm: 25, lamination: "AL foil", rate: foil25.rate },
  ],
};

// Test 1: supplied calculation example without wastage.
const noWaste = calculateBuiltUpCylinderInsulation({ ...twoLayerBase, wastagePercent: 0 });
near(noWaste.layers[0].meanDiameterMm, 225);
near(noWaste.layers[0].netAreaM2, 7.068583, 0.00001);
near(noWaste.layers[1].meanDiameterMm, 275);
near(noWaste.layers[1].netAreaM2, 8.639380, 0.00001);
near(noWaste.finishedOuterDiameterMm, 300);

// Test 2: 5% wastage and total consumption.
const fivePercent = calculateBuiltUpCylinderInsulation({ ...twoLayerBase, wastagePercent: 5 });
near(fivePercent.layers[0].quotedAreaM2, 7.422012, 0.00001);
near(fivePercent.layers[1].quotedAreaM2, 9.071349, 0.00001);
near(fivePercent.totalQuotedAreaM2, 16.493361, 0.00001);

// Test 3: exact total thickness is mandatory.
assert.throws(() => calculateBuiltUpCylinderInsulation({ ...twoLayerBase, layers: [twoLayerBase.layers[0], { ...twoLayerBase.layers[1], thicknessMm: 19 }], wastagePercent: 5 }), (error: unknown) => error instanceof BuiltUpNbrValidationError && /44 mm.*6 mm remaining/i.test(error.message));

// Test 4: a third layer starts outside the previous two layers.
const threeLayer = calculateBuiltUpCylinderInsulation({ ...twoLayerBase, requiredTotalThicknessMm: 75, layers: [...twoLayerBase.layers, { ...twoLayerBase.layers[0], variantId: plain25.id }], wastagePercent: 0 });
near(threeLayer.layers[2].innerDiameterMm, 300);
near(threeLayer.layers[2].meanDiameterMm, 325);

// Test 5: each facing is independently rate-priced.
assert.notEqual(fivePercent.layers[0].rate, fivePercent.layers[1].rate);
near(fivePercent.layers[0].amount || 0, fivePercent.layers[0].quotedAreaM2 * plain25.rate, 0.011);
near(fivePercent.layers[1].amount || 0, fivePercent.layers[1].quotedAreaM2 * foil25.rate, 0.011);

// Test 6/7: geometry accepts only its defined inputs. Extra browser fields
// cannot affect sheet area or amount; the server passes trusted Rate Card data.
const tamperedBrowserPayload = calculateBuiltUpCylinderInsulation({
  ...twoLayerBase,
  wastagePercent: 5,
  quotedAreaM2: 1,
  rate: 1,
  amount: 1,
} as never);
near(tamperedBrowserPayload.totalQuotedAreaM2, 16.493361, 0.00001);
assert.ok((tamperedBrowserPayload.basicAmount || 0) > 1, "Trusted pricing inputs must not be replaced by extraneous browser fields.");

console.log("Built-up NBR calculation tests passed.");
