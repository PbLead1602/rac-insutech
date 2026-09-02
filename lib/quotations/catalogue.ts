import { nitrileTubeClassORateCard } from "@/lib/quotations/nitrile-tube-rate-card";
import { nitrileTubeClass1RateCard } from "@/lib/quotations/nitrile-tube-class1-rate-card";
import { xlpeTubeRateCard } from "@/lib/quotations/xlpe-tube-rate-card";

export type QuoteProductId = "xlpe-sheet" | "xlpe-tube" | "nitrile-rubber-sheet" | "open-cell-nitrile-rubber-sheet" | "nitrile-rubber-tube" | "nitrile-rubber-tube-class-1" | "insulation-tape" | "insulation-adhesive";
export type QuoteOrderUnit = "roll" | "square_metre" | "box" | "running_metre" | "carton" | "unit" | "drum";

export type QuoteVariant = {
  id: string;
  productId: QuoteProductId;
  productName: string;
  materialClass: string;
  thickness: string;
  size: string;
  lamination: string;
  orderUnit: QuoteOrderUnit;
  rate: number;
  rateUnit: "square metre" | "running metre" | "tube" | "unit" | "litre";
  rollAreaM2?: number;
  packSquareMetres?: number;
  packRunningMetres?: number;
  packTubes?: number;
  tubeLength?: string;
  packLitres?: number;
  packUnitLabel?: string;
  technicalDescription: string;
};

export type CalculatedQuoteLine = {
  variantId: string;
  productName: string;
  configuration: string;
  requestedQuantity: number;
  requestedUnit: QuoteOrderUnit;
  suppliedQuantity: number;
  suppliedUnit: "square metres" | "running metres" | "tubes" | "litres" | "units";
  rolls?: number;
  cartons?: number;
  technicalQuantity: string;
  rate: number;
  rateUnit: string;
  amount: number;
  provisional: true;
};

type LaminationRates = Record<string, number>;
type SheetRateRow = {
  thickness: string;
  thicknessInches: string;
  width: number;
  length: number;
  rates: Record<string, LaminationRates>;
};

type OpenCellNitrileSheetRateRow = {
  thickness: string;
  rate: number;
  boxSquareMetres: number;
};

const nitrileSheetRateCard: SheetRateRow[] = [
  { thickness: "6 mm", thicknessInches: "1/4", width: 1.2, length: 30, rates: { "Class I": { Plain: 71.415, "AL foil": 137.54, "GC cloth": 269.79 }, "Class O": { Plain: 87.285, "AL foil": 153.41, "GC cloth": 285.66 } } },
  { thickness: "9 mm", thicknessInches: "3/8", width: 1.2, length: 20, rates: { "Class I": { Plain: 107.1225, "AL foil": 173.2475, "GC cloth": 305.4975 }, "Class O": { Plain: 130.9275, "AL foil": 197.0525, "GC cloth": 329.3025 } } },
  { thickness: "13 mm", thicknessInches: "1/2", width: 1.2, length: 14, rates: { "Class I": { Plain: 154.7325, "AL foil": 220.8575, "GC cloth": 353.1075 }, "Class O": { Plain: 189.1175, "AL foil": 255.2425, "GC cloth": 387.4925 } } },
  { thickness: "16 mm", thicknessInches: "5/8", width: 1.2, length: 12, rates: { "Class I": { Plain: 190.44, "AL foil": 256.565, "GC cloth": 388.815 }, "Class O": { Plain: 232.76, "AL foil": 298.885, "GC cloth": 431.135 } } },
  { thickness: "19 mm", thicknessInches: "3/4", width: 1.2, length: 10, rates: { "Class I": { Plain: 226.1475, "AL foil": 292.2725, "GC cloth": 424.5225 }, "Class O": { Plain: 276.4025, "AL foil": 342.5275, "GC cloth": 474.7775 } } },
  { thickness: "25 mm", thicknessInches: "1", width: 1.2, length: 8, rates: { "Class I": { Plain: 297.5625, "AL foil": 363.6875, "GC cloth": 495.9375 }, "Class O": { Plain: 363.6875, "AL foil": 429.8125, "GC cloth": 562.0625 } } },
  { thickness: "32 mm", thicknessInches: "1 1/4", width: 1.2, length: 6, rates: { "Class I": { Plain: 380.88, "AL foil": 447.005, "GC cloth": 579.255 }, "Class O": { Plain: 465.52, "AL foil": 531.645, "GC cloth": 663.895 } } },
];

const xlpeSheetRateCard: SheetRateRow[] = [
  { thickness: "6 mm", thicknessInches: "1/4", width: 1.25, length: 60, rates: { "Class I": { Plain: 72.657, "AL foil": 113.022, "Met Pet foil": 106.2945 }, "Class O": { "AL foil": 117.438, "GC cloth": 275.448 } } },
  { thickness: "9 mm", thicknessInches: "3/8", width: 1.25, length: 40, rates: { "Class I": { Plain: 108.9855, "AL foil": 149.3505, "Met Pet foil": 142.623 }, "Class O": { "AL foil": 155.9745, "GC cloth": 313.9845 } } },
  { thickness: "13 mm", thicknessInches: "1/2", width: 1.25, length: 25, rates: { "Class I": { Plain: 157.4235, "AL foil": 197.7885, "Met Pet foil": 191.061 }, "Class O": { "AL foil": 207.3565, "GC cloth": 365.3665 } } },
  { thickness: "19 mm", thicknessInches: "3/4", width: 1.22, length: 20, rates: { "Class I": { Plain: 230.0805, "AL foil": 270.4455, "Met Pet foil": 263.718 }, "Class O": { "AL foil": 284.4295, "GC cloth": 442.4395 } } },
  { thickness: "25 mm", thicknessInches: "1", width: 1.22, length: 15, rates: { "Class I": { Plain: 302.7375, "AL foil": 343.1025, "Met Pet foil": 336.375 }, "Class O": { "AL foil": 361.5025, "GC cloth": 519.5125 } } },
  { thickness: "32 mm", thicknessInches: "1 1/4", width: 1.22, length: 2, rates: { "Class I": { Plain: 387.504, "AL foil": 427.869, "Met Pet foil": 421.1415 }, "Class O": { "AL foil": 451.421, "GC cloth": 609.431 } } },
];

const openCellNitrileSheetRateCard: OpenCellNitrileSheetRateRow[] = [
  { thickness: "10 mm", rate: 463, boxSquareMetres: 12 },
  { thickness: "15 mm", rate: 694, boxSquareMetres: 8 },
  { thickness: "20 mm", rate: 926, boxSquareMetres: 6 },
  { thickness: "25 mm", rate: 1157, boxSquareMetres: 5 },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function buildSheetVariants(productId: "xlpe-sheet" | "nitrile-rubber-sheet", productName: string, rateCard: SheetRateRow[]) {
  return rateCard.flatMap((row) => Object.entries(row.rates).flatMap(([materialClass, laminationRates]) => Object.entries(laminationRates).map(([lamination, rate]) => {
    const area = Number((row.width * row.length).toFixed(2));
    const thickness = `${row.thickness} (${row.thicknessInches} in)`;
    return {
      id: `${productId}-${slug(materialClass)}-${slug(row.thickness)}-${slug(lamination)}`,
      productId,
      productName,
      materialClass,
      thickness,
      size: `${row.width} m × ${row.length} m (${area.toFixed(2)} m² / roll)`,
      lamination,
      orderUnit: "roll" as const,
      rate,
      rateUnit: "square metre" as const,
      rollAreaM2: area,
      technicalDescription: `${row.width} m × ${row.length} m roll; ${area.toFixed(2)} m² per roll`,
    };
  })));
}

const openCellNitrileSheetVariants: QuoteVariant[] = openCellNitrileSheetRateCard.map((row) => ({
  id: `open-cell-nitrile-rubber-sheet-class-1-${slug(row.thickness)}-plain`,
  productId: "open-cell-nitrile-rubber-sheet",
  productName: "Open Cell Nitrile Rubber Sheet",
  materialClass: "Class 1",
  thickness: row.thickness,
  size: `1 m × 1 m (1.00 m² / sheet; ${row.boxSquareMetres} m² / box; 180–200 kg/m³)`,
  lamination: "Plain",
  orderUnit: "box",
  rate: row.rate,
  rateUnit: "square metre",
  rollAreaM2: 1,
  packSquareMetres: row.boxSquareMetres,
  technicalDescription: `180–200 kg/m³ density; 1 m × 1 m sheet; reference packing ${row.boxSquareMetres} m² per box`,
}));

const tubeVariants = nitrileTubeClassORateCard.flatMap((row, index) => {
  const size = `${row.pipeSize} | ${row.insideDiameter} | ${row.outsideDiameter}`;
  return [
    ["Plain", row.plainRate],
    ["AL foil", row.alFoilRate],
    ["GC cloth", row.gcClothRate],
  ].map(([lamination, rate]) => ({
    id: `nitrile-tube-class-o-${index + 1}-${slug(String(lamination))}`,
    productId: "nitrile-rubber-tube" as const,
    productName: "Nitrile Rubber Tube Class O",
    materialClass: "Class O",
    thickness: row.thickness,
    size,
    lamination: String(lamination),
    orderUnit: "running_metre" as const,
    rate: Number(rate),
    rateUnit: "running metre" as const,
    packRunningMetres: row.packRunningMetres,
    technicalDescription: `${size}; packed in ${row.packRunningMetres} running-metre cartons`,
  }));
});

const class1TubeVariants: QuoteVariant[] = nitrileTubeClass1RateCard.map((row, index) => {
  const size = `${row.idInch} ID | ${row.thickness} × ${row.insideDiameter} | ${row.tubesPerCarton} tubes / carton | 1830 +/- 50 mm length`;
  return {
    id: `nitrile-tube-class-1-${index + 1}`,
    productId: "nitrile-rubber-tube-class-1",
    productName: "Nitrile Rubber Tube - Class 1",
    materialClass: "Class 1",
    thickness: row.thickness,
    size,
    lamination: "Plain",
    orderUnit: "carton",
    rate: row.ratePerTube,
    rateUnit: "tube",
    packTubes: row.tubesPerCarton,
    tubeLength: "1830 +/- 50 mm",
    technicalDescription: `${row.thickness} × ${row.insideDiameter}; ${row.tubesPerCarton} tubes per carton; nominal length 1830 +/- 50 mm`,
  };
});

const xlpeTubeVariants: QuoteVariant[] = xlpeTubeRateCard.flatMap((row, index) => {
  const size = `${row.pipeSize} | ${row.insideDiameter} | ${row.outsideDiameter} | ${row.suppliedLengthMetres} m supplied length`;
  return [
    { lamination: "ALU foil", rate: row.aluFoilRate },
    ...(row.plainRate === undefined ? [] : [{ lamination: "Plain", rate: row.plainRate }]),
  ].map((option) => ({
    id: `xlpe-tube-${index + 1}-${slug(option.lamination)}`,
    productId: "xlpe-tube" as const,
    productName: "XLPE Tubes",
    materialClass: "Standard",
    thickness: row.thickness,
    size,
    lamination: option.lamination,
    orderUnit: "running_metre" as const,
    rate: option.rate,
    rateUnit: "running metre" as const,
    packRunningMetres: row.suppliedLengthMetres,
    packUnitLabel: `${row.suppliedLengthMetres} m tube length`,
    technicalDescription: `${size}; rate supplied per running metre in the attached XLPE tube rate list`,
  }));
});

const insulationTapeRateCard = [
  ["Aluminium Tape", 25, 20, 100], ["Aluminium Tape", 50, 20, 150], ["Aluminium Tape", 75, 20, 200], ["Aluminium Tape", 100, 20, 300],
  ["Aluminium Tape FSK", 25, 20, 150], ["Aluminium Tape FSK", 50, 20, 250], ["Aluminium Tape FSK", 75, 20, 350], ["Aluminium Tape FSK", 100, 20, 400],
  ["ALUPET Tape", 25, 20, 100], ["ALUPET Tape", 50, 20, 150], ["ALUPET Tape", 75, 20, 200], ["ALUPET Tape", 100, 20, 300],
  ["Glass Cloth Tape", 25, 20, 200], ["Glass Cloth Tape", 50, 20, 300], ["Glass Cloth Tape", 75, 20, 400], ["Glass Cloth Tape", 100, 20, 500],
] as const;

const insulationTapeVariants: QuoteVariant[] = insulationTapeRateCard.map(([tapeType, width, listedLength, rate], index) => ({
  id: `insulation-tape-${slug(tapeType)}-${width}-${listedLength}`,
  productId: "insulation-tape",
  productName: "Insulation Tape",
  materialClass: tapeType,
  thickness: "Not applicable",
  size: `${width} mm width × ${listedLength} m roll`,
  lamination: "Not applicable",
  orderUnit: "unit",
  rate,
  rateUnit: "unit",
  packUnitLabel: "tape roll",
  technicalDescription: `${tapeType}; ${width} mm width; 20 m roll length; rate supplied per unit in the attached tape list`,
}));

const insulationAdhesiveRateCard = [
  ["PEDILITE SR505", 1, 250], ["PEDILITE SR505", 5, 250], ["PEDILITE SR505", 30, 250],
  ["PEDILITE SR998", 1, 320], ["PEDILITE SR998", 5, 320], ["PEDILITE SR998", 30, 320],
  ["POLYGRIP S 709", 1, 220], ["POLYGRIP S 709", 5, 220], ["POLYGRIP S 709", 30, 220],
] as const;

const insulationAdhesiveVariants: QuoteVariant[] = insulationAdhesiveRateCard.map(([grade, litres, rate], index) => ({
  id: `insulation-adhesive-${slug(grade)}-${litres}-litre`,
  productId: "insulation-adhesive",
  productName: "Insulation Adhesive",
  materialClass: grade,
  thickness: "Not applicable",
  size: `${litres} L drum`,
  lamination: "Not applicable",
  orderUnit: "drum",
  rate,
  rateUnit: "litre",
  packLitres: litres,
  packUnitLabel: "drum",
  technicalDescription: `${grade}; ${litres} L drum; rate supplied per litre in the attached adhesive list`,
}));

/**
 * Rate-card configuration imported from the supplied XLPE/NBR sheet and
 * Nitrile Tube Class O workbook. Server-side code revalidates every selected
 * item and, once configured, replaces the embedded rate with Supabase data.
 */
export const quotationVariants: QuoteVariant[] = [
  ...buildSheetVariants("xlpe-sheet", "XLPE Sheet Insulation", xlpeSheetRateCard),
  ...xlpeTubeVariants,
  ...buildSheetVariants("nitrile-rubber-sheet", "Nitrile Rubber Sheet", nitrileSheetRateCard),
  ...openCellNitrileSheetVariants,
  ...tubeVariants,
  ...class1TubeVariants,
  ...insulationTapeVariants,
  ...insulationAdhesiveVariants,
];

export const quotationProducts: Array<{ id: QuoteProductId; name: string; description: string }> = [
  { id: "xlpe-sheet", name: "XLPE Sheet Insulation", description: "Rate-card dimensions and lamination options for closed-cell sheet insulation." },
  { id: "xlpe-tube", name: "XLPE Tubes", description: "Running-metre rates, pipe sizes, tube dimensions and plain or aluminium-foil options from the supplied rate list." },
  { id: "nitrile-rubber-sheet", name: "Nitrile Rubber Sheet", description: "Rate-card dimensions and lamination options for flexible elastomeric sheet insulation." },
  { id: "open-cell-nitrile-rubber-sheet", name: "Open Cell Nitrile Rubber Sheet", description: "Plain Class 1, 180–200 kg/m³ density sheet insulation priced per square metre." },
  { id: "nitrile-rubber-tube", name: "Nitrile Rubber Tube Class O", description: "Class O tube sizes, carton lengths and lamination rates from the supplied rate card." },
  { id: "nitrile-rubber-tube-class-1", name: "Nitrile Rubber Tube - Class 1", description: "Plain Class 1 tubes, supplied in cartons and priced per tube." },
  { id: "insulation-tape", name: "Insulation Tape", description: "Tape type, roll width and rate-per-unit options from the supplied rate list." },
  { id: "insulation-adhesive", name: "Insulation Adhesive", description: "Adhesive grades, drum sizes and rate-per-litre options from the supplied rate list." },
];

export function getQuotationVariant(id: string) {
  return quotationVariants.find((variant) => variant.id === id);
}

export function quoteOptions(productId: QuoteProductId, field: "materialClass" | "thickness" | "size" | "lamination", selections: Partial<Pick<QuoteVariant, "materialClass" | "thickness" | "size" | "lamination">> = {}) {
  const predecessors: Record<typeof field, Array<keyof typeof selections>> = {
    materialClass: [],
    thickness: ["materialClass"],
    size: ["materialClass", "thickness"],
    lamination: ["materialClass", "thickness", "size"],
  };
  const possible = quotationVariants.filter((variant) => variant.productId === productId && predecessors[field].every((key) => !selections[key] || variant[key] === selections[key]));
  return [...new Set(possible.map((variant) => variant[field]))];
}

export function findQuoteVariant(configuration: Pick<QuoteVariant, "productId" | "materialClass" | "thickness" | "size" | "lamination">) {
  return quotationVariants.find((variant) => (
    variant.productId === configuration.productId
    && variant.materialClass === configuration.materialClass
    && variant.thickness === configuration.thickness
    && variant.size === configuration.size
    && variant.lamination === configuration.lamination
  ));
}

export function calculateQuoteLine(variant: QuoteVariant, quantity: number, orderUnit: QuoteOrderUnit): CalculatedQuoteLine {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Enter a quantity greater than zero.");
  if (variant.orderUnit === "roll" && orderUnit !== "roll") throw new Error("This sheet product is quoted by roll.");
  if (variant.orderUnit === "square_metre" && orderUnit !== "square_metre") throw new Error("This sheet product is quoted by square metre.");
  if (variant.orderUnit === "box" && orderUnit !== "box") throw new Error("This product is quoted by box packing.");
  if (variant.orderUnit === "carton" && orderUnit !== "carton") throw new Error("This tube product is quoted by carton.");
  if (variant.orderUnit === "unit" && orderUnit !== "unit") throw new Error("This product is quoted per unit.");
  if (variant.orderUnit === "drum" && orderUnit !== "drum") throw new Error("This product is quoted by drum.");
  if (variant.orderUnit === "running_metre" && !["running_metre", "carton"].includes(orderUnit)) throw new Error("Choose running metres or cartons where packing requires it.");

  if (variant.orderUnit === "roll") {
    if (!Number.isInteger(quantity)) throw new Error("Enter a whole number of rolls.");
    const rollArea = variant.rollAreaM2 || 1;
    const rolls = quantity;
    const suppliedQuantity = Number((rolls * rollArea).toFixed(2));
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "square metres",
      rolls,
      technicalQuantity: `${suppliedQuantity.toFixed(2)} m² (${rolls} roll${rolls === 1 ? "" : "s"} × ${rollArea.toFixed(2)} m²)`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  if (variant.orderUnit === "square_metre") {
    const suppliedQuantity = Number(quantity.toFixed(2));
    const packNote = variant.packSquareMetres ? `; reference packing ${variant.packSquareMetres} m² per box` : "";
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "square metres",
      technicalQuantity: `${suppliedQuantity.toFixed(2)} m²${packNote}`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  if (variant.orderUnit === "box") {
    if (!Number.isInteger(quantity)) throw new Error("Enter a whole number of boxes.");
    const boxSquareMetres = variant.packSquareMetres || 1;
    const suppliedQuantity = Number((quantity * boxSquareMetres).toFixed(2));
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "square metres",
      technicalQuantity: `${quantity} box${quantity === 1 ? "" : "es"} × ${boxSquareMetres} m² = ${suppliedQuantity.toFixed(2)} m²`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  if (variant.orderUnit === "carton") {
    if (!Number.isInteger(quantity)) throw new Error("Enter a whole number of cartons.");
    const tubesPerCarton = variant.packTubes || 1;
    const suppliedQuantity = quantity * tubesPerCarton;
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "tubes",
      cartons: quantity,
      technicalQuantity: `${quantity} carton${quantity === 1 ? "" : "s"} × ${tubesPerCarton} tubes = ${suppliedQuantity} tubes (${variant.tubeLength || "1830 +/- 50 mm"} each)`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  if (variant.orderUnit === "unit") {
    if (!Number.isInteger(quantity)) throw new Error("Enter a whole number of units.");
    const suppliedQuantity = quantity;
    const unitLabel = variant.packUnitLabel || "unit";
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "units",
      technicalQuantity: `${quantity} ${unitLabel}${quantity === 1 ? "" : "s"}`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  if (variant.orderUnit === "drum") {
    if (!Number.isInteger(quantity)) throw new Error("Enter a whole number of drums.");
    const litresPerDrum = variant.packLitres || 1;
    const suppliedQuantity = Number((quantity * litresPerDrum).toFixed(2));
    return {
      variantId: variant.id,
      productName: variant.productName,
      configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
      requestedQuantity: quantity,
      requestedUnit: orderUnit,
      suppliedQuantity,
      suppliedUnit: "litres",
      technicalQuantity: `${quantity} drum${quantity === 1 ? "" : "s"} × ${litresPerDrum} L = ${suppliedQuantity.toFixed(2)} litres`,
      rate: variant.rate,
      rateUnit: `per ${variant.rateUnit}`,
      amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
      provisional: true,
    };
  }

  const pack = variant.packRunningMetres || 1;
  if (orderUnit === "carton" && !Number.isInteger(quantity)) throw new Error("Enter a whole number of cartons.");
  const cartons = orderUnit === "carton" ? Math.ceil(quantity) : Math.ceil(quantity / pack);
  const suppliedQuantity = cartons * pack;
  const packingText = orderUnit === "carton" ? `${cartons} carton${cartons === 1 ? "" : "s"} × ${pack} rm` : `${cartons} × ${variant.packUnitLabel || `${pack} m supplied length`}`;
  return {
    variantId: variant.id,
    productName: variant.productName,
    configuration: `${variant.materialClass} | ${variant.thickness} | ${variant.size} | ${variant.lamination}`,
    requestedQuantity: quantity,
    requestedUnit: orderUnit,
    suppliedQuantity,
    suppliedUnit: "running metres",
    // @ts-expect-error Running-metre products override this legacy carton field below.
    cartons,
    // @ts-expect-error Running-metre products override this legacy display text below.
    technicalQuantity: `${suppliedQuantity.toFixed(0)} running metres (${cartons} carton${cartons === 1 ? "" : "s"} × ${pack} rm)`,
    rate: variant.rate,
    rateUnit: `per ${variant.rateUnit}`,
    amount: Number((suppliedQuantity * variant.rate).toFixed(2)),
    provisional: true,
    ...{ technicalQuantity: `${suppliedQuantity.toFixed(0)} running metres (${packingText})`, cartons: orderUnit === "carton" ? cartons : undefined },
  };
}

export function productIdFromDraft(product: string): QuoteProductId | undefined {
  const value = product.toLowerCase();
  if (value.includes("adhesive")) return "insulation-adhesive";
  if (value.includes("tape")) return "insulation-tape";
  if (value.includes("open") && value.includes("nitrile")) return "open-cell-nitrile-rubber-sheet";
  if (value.includes("nitrile") && value.includes("tube") && value.includes("class 1")) return "nitrile-rubber-tube-class-1";
  if (value.includes("nitrile") && value.includes("tube")) return "nitrile-rubber-tube";
  if (value.includes("nitrile")) return "nitrile-rubber-sheet";
  if (value.includes("xlpe") && value.includes("tube")) return "xlpe-tube";
  if (value.includes("xlpe") && (value.includes("sheet") || !value.includes("tube"))) return "xlpe-sheet";
  return undefined;
}
