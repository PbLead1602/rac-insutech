import assert from "node:assert/strict";
import type { QuotationRateCardRecord } from "../lib/db/types";
import { canonicalLamination, canonicalMaterialClass, canonicalRateConfigurationKey, canonicalThickness, parseImportedRate, reconcileRateConfiguration } from "../lib/rates/canonical-rate-key";

type ImportedRateConfiguration = Pick<QuotationRateCardRecord, "productSlug" | "productName" | "materialClass" | "thickness" | "sizeLabel" | "lamination" | "orderUnit" | "rate" | "rateUnit" | "rollAreaM2">;

const mapping: ImportedRateConfiguration = {
  productSlug: "NBR Sheet",
  productName: "Nitrile Rubber Sheet",
  materialClass: "CLASS I",
  thickness: "6.0 mm",
  sizeLabel: "1.20 m × 30.00 m (36.00 m² / roll)",
  lamination: "Aluminum Foil",
  orderUnit: "roll",
  rate: 74.52,
  rateUnit: "square meter",
  rollAreaM2: 36,
};

function card(overrides: Partial<QuotationRateCardRecord> = {}): QuotationRateCardRecord {
  return {
    id: "rate-1",
    productSlug: "nitrile-rubber-sheet",
    productName: "Nitrile Rubber Sheet",
    materialClass: "Class 1",
    thickness: "6 mm (1/4 in)",
    sizeLabel: "1200 mm x 30000 mm (36 m2 / roll)",
    lamination: "AL foil",
    orderUnit: "roll",
    rate: 74.52,
    rateUnit: "square metre",
    gstRate: 18,
    active: true,
    createdAt: "2026-09-10T00:00:00.000Z",
    ...overrides,
  };
}

assert.equal(canonicalMaterialClass("Class I"), canonicalMaterialClass("class 1"));
assert.equal(canonicalMaterialClass("Class O"), canonicalMaterialClass("CLASS 0"));
assert.equal(canonicalLamination("No Lamination"), canonicalLamination("plain"));
assert.equal(canonicalLamination("GC Cloth"), canonicalLamination("Glass Cloth"));
assert.equal(canonicalLamination("MetPET"), canonicalLamination("Met Pet foil"));
assert.equal(canonicalThickness("6"), canonicalThickness("6.0 mm"));
assert.equal(parseImportedRate("₹ 74.5200"), 74.52);
assert.equal(canonicalRateConfigurationKey(mapping), canonicalRateConfigurationKey(card()));
assert.equal(canonicalRateConfigurationKey({ ...mapping, sizeLabel: "1200 mm \u00c3\u2014 30000 mm (36 m\u00c2\u00b2 / roll)" }), canonicalRateConfigurationKey(card()));

assert.equal(reconcileRateConfiguration(mapping, [card()]).action, "unchanged");
assert.equal(reconcileRateConfiguration({ ...mapping, rate: 77.63 }, [card()]).action, "update");
assert.equal(reconcileRateConfiguration(mapping, []).action, "create");
assert.equal(reconcileRateConfiguration(mapping, [card(), card({ id: "rate-2", rate: 70 })]).action, "duplicate");

console.log("Rate import canonical reconciliation tests passed.");
