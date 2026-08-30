import "server-only";

import { createHash } from "crypto";
import { inflateRawSync } from "zlib";
import { quotationVariants, type QuoteVariant } from "@/lib/quotations/catalogue";
import type { QuotationRateCardRecord } from "@/lib/db/types";

export const rateImportProfiles = [
  { id: "auto", name: "Auto-detect from workbook" },
  { id: "xlpe-tubes", name: "XLPE Tubes — supplier master rate list" },
  { id: "nitrile-tube-class-1", name: "Nitrile Rubber Tube — Class 1" },
  { id: "nitrile-tube-class-o", name: "Nitrile Rubber Tube — Class O" },
  { id: "sheet-insulation", name: "XLPE & Nitrile Rubber Sheet rate list" },
  { id: "insulation-tape", name: "Insulation Tape rate list" },
  { id: "insulation-adhesive", name: "Insulation Adhesive rate list" },
] as const;

export type RateImportProfileId = typeof rateImportProfiles[number]["id"];
export type RateImportAction = "create" | "update" | "unchanged" | "invalid" | "duplicate";
export type RateImportConfidence = "high" | "review";

export type ImportedRateConfiguration = {
  productSlug: string;
  productName: string;
  materialClass: string;
  thickness: string;
  sizeLabel: string;
  lamination: string;
  orderUnit: QuotationRateCardRecord["orderUnit"];
  rate: number;
  rateUnit: string;
  rollAreaM2?: number;
  packRunningMetres?: number;
  packingLabel?: string;
};

export type RateImportRow = {
  id: string;
  sourceRow: number;
  sheetName: string;
  source: Record<string, string>;
  mapping?: ImportedRateConfiguration;
  action: RateImportAction;
  confidence: RateImportConfidence;
  issues: string[];
  oldRate?: number;
  existingRateCardId?: string;
  reactivate?: boolean;
};

export type RateImportAnalysis = {
  id: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  profileId: Exclude<RateImportProfileId, "auto">;
  profileName: string;
  analysedAt: string;
  sheets: string[];
  rows: RateImportRow[];
  summary: Record<RateImportAction, number>;
};

type WorkbookSheet = { name: string; rows: string[][] };
type SourceCandidate = { sourceRow: number; sheetName: string; source: Record<string, string>; variant?: QuoteVariant; rate?: number; confidence: RateImportConfidence; issues: string[] };

const textDecoder = new TextDecoder();
const profileLabel = (id: Exclude<RateImportProfileId, "auto">) => rateImportProfiles.find((profile) => profile.id === id)?.name || id;

function cellColumn(reference = "A1") {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xmlDecode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(?:x([\da-fA-F]+)|(\d+));/g, (_, hex, decimal) => String.fromCodePoint(Number(hex ? `0x${hex}` : decimal)));
}

function attr(source: string, name: string) {
  return source.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] || "";
}

function zipEntries(buffer: Buffer) {
  let end = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 0x10016); index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) { end = index; break; }
  }
  if (end < 0) throw new Error("The file is not a valid XLSX workbook.");
  const count = buffer.readUInt16LE(end + 10); const directory = buffer.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>(); let cursor = directory;
  for (let entry = 0; entry < count; entry += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("The XLSX central directory is invalid.");
    const method = buffer.readUInt16LE(cursor + 10); const compressedSize = buffer.readUInt32LE(cursor + 20); const nameLength = buffer.readUInt16LE(cursor + 28); const extraLength = buffer.readUInt16LE(cursor + 30); const commentLength = buffer.readUInt16LE(cursor + 32); const localOffset = buffer.readUInt32LE(cursor + 42); const name = textDecoder.decode(buffer.subarray(cursor + 46, cursor + 46 + nameLength));
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("The XLSX local file header is invalid.");
    const localNameLength = buffer.readUInt16LE(localOffset + 26); const localExtraLength = buffer.readUInt16LE(localOffset + 28); const start = localOffset + 30 + localNameLength + localExtraLength; const payload = buffer.subarray(start, start + compressedSize);
    entries.set(name, method === 0 ? payload : method === 8 ? inflateRawSync(payload) : (() => { throw new Error("This XLSX compression method is not supported."); })());
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function richText(source: string) {
  return xmlDecode([...source.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1].replace(/<[^>]+>/g, "")).join(""));
}

function readWorksheet(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const index = Math.max(0, Number(attr(row[1], "r")) - 1); const values: string[] = [];
    for (const cell of row[2].matchAll(/<c\b((?:(?!\/>).)*?)>([\s\S]*?)<\/c>/g)) {
      const column = cellColumn(attr(cell[1], "r")); const type = attr(cell[1], "t"); const inner = cell[2]; const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] || "";
      values[column] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "inlineStr" ? richText(inner) : xmlDecode(raw);
    }
    rows[index] = values;
  }
  return rows.map((row) => row || []);
}

function readWorkbook(bytes: Uint8Array): WorkbookSheet[] {
  const entries = zipEntries(Buffer.from(bytes));
  const stringsXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") || "";
  const sharedStrings = [...stringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((item) => richText(item[1]));
  const workbookXml = entries.get("xl/workbook.xml")?.toString("utf8") || "";
  const relsXml = entries.get("xl/_rels/workbook.xml.rels")?.toString("utf8") || "";
  const targets = new Map([...relsXml.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)].map((match) => [attr(match[1], "Id"), attr(match[1], "Target").replace(/^\//, "").replace(/^xl\//, "")]));
  const sheets = [...workbookXml.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)].map((match, index) => {
    const relation = attr(match[1], "r:id"); const target = targets.get(relation) || `worksheets/sheet${index + 1}.xml`; const path = target.startsWith("xl/") ? target : `xl/${target}`;
    return { name: xmlDecode(attr(match[1], "name")) || `Sheet ${index + 1}`, xml: entries.get(path)?.toString("utf8") || "" };
  }).filter((sheet) => sheet.xml);
  if (!sheets.length) throw new Error("No worksheet data could be found in this XLSX file.");
  return sheets.map((sheet) => ({ name: sheet.name, rows: readWorksheet(sheet.xml, sharedStrings) }));
}

function numberValue(value: string | undefined) {
  const normalized = String(value || "").replace(/[₹,\s]/g, "").replace(/^INR/i, "");
  return /^-?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : undefined;
}

function sourceRecord(row: string[]) {
  return Object.fromEntries(row.map((value, index) => [`Column ${String.fromCharCode(65 + index)}`, value || ""]).filter(([, value]) => value));
}

function variantConfiguration(variant: QuoteVariant, rate: number): ImportedRateConfiguration {
  return { productSlug: variant.productId, productName: variant.productName, materialClass: variant.materialClass, thickness: variant.thickness, sizeLabel: variant.size, lamination: variant.lamination, orderUnit: variant.orderUnit, rate, rateUnit: variant.rateUnit, rollAreaM2: variant.rollAreaM2, packRunningMetres: variant.packRunningMetres, packingLabel: variant.orderUnit === "carton" ? `${variant.packTubes || 1} tubes / carton` : variant.orderUnit === "drum" ? `${variant.packLitres || 1} L / drum` : variant.packUnitLabel };
}

function productVariants(productId: QuoteVariant["productId"]) { return quotationVariants.filter((variant) => variant.productId === productId); }
function numberedRows(sheet: WorkbookSheet) { return sheet.rows.map((row, index) => ({ row, sourceRow: index + 1 })).filter(({ row }) => numberValue(row[0]) !== undefined); }

function orderedCandidates(sheet: WorkbookSheet, variants: QuoteVariant[], rateColumns: number[], confidence: RateImportConfidence, profileIssue?: string, requireSerial = false): SourceCandidate[] {
  const rows = sheet.rows.map((row, index) => ({ row, sourceRow: index + 1 })).filter(({ row }) => (!requireSerial || numberValue(row[0]) !== undefined) && rateColumns.some((column) => numberValue(row[column]) !== undefined)); const candidates: SourceCandidate[] = [];
  rows.forEach(({ row, sourceRow }, index) => {
    const variant = variants[index]; const rates = rateColumns.map((column) => numberValue(row[column])).filter((value): value is number => value !== undefined);
    if (!variant) return;
    const rate = rates.at(-1);
    candidates.push({ sourceRow, sheetName: sheet.name, source: sourceRecord(row), variant, rate, confidence, issues: [...(profileIssue ? [profileIssue] : []), ...(rate === undefined ? ["A valid final rate was not found in the expected source column."] : [])] });
  });
  return candidates;
}

function tubeCandidates(sheet: WorkbookSheet, productId: "xlpe-tube" | "nitrile-rubber-tube" | "nitrile-rubber-tube-class-1") {
  const variants = productVariants(productId); const candidates: SourceCandidate[] = [];
  const rows = sheet.rows.map((row, index) => ({ row, sourceRow: index + 1 })).filter(({ row }) => {
    if (productId === "xlpe-tube" || productId === "nitrile-rubber-tube-class-1") return numberValue(row[0]) !== undefined;
    return numberValue(row[2]) !== undefined && numberValue(row[16]) !== undefined;
  });

  rows.forEach(({ row, sourceRow }) => {
    let matching: QuoteVariant[] = []; let rateFor = (_variant: QuoteVariant) => undefined as number | undefined;
    if (productId === "xlpe-tube") {
      const [pipe, thickness, insideDiameter, outsideDiameter, suppliedLength] = [row[1]?.trim(), numberValue(row[3]), numberValue(row[4]), numberValue(row[5]), numberValue(row[6])];
      matching = variants.filter((variant) => pipe && thickness !== undefined && insideDiameter !== undefined && outsideDiameter !== undefined && suppliedLength !== undefined && variant.thickness === `${thickness} mm` && variant.size === `${pipe} | ${insideDiameter} mm ID | ${outsideDiameter} mm OD | ${suppliedLength} m supplied length`);
      rateFor = (variant) => numberValue(row[variant.lamination === "ALU foil" ? 13 : 14]);
    } else if (productId === "nitrile-rubber-tube-class-1") {
      const pipe = normalized(row[3] || ""); const dimensions = (row[4] || "").split(/x/i).map(numberValue); const cartons = numberValue(row[5]); const [thickness, insideDiameter] = dimensions;
      matching = variants.filter((variant) => thickness !== undefined && insideDiameter !== undefined && cartons !== undefined && variant.thickness === `${thickness} mm` && variant.packTubes === cartons && normalized(variant.size).startsWith(`${pipe}inid${thickness}mm${insideDiameter}mm`));
      rateFor = () => numberValue(row[13]);
    } else {
      const pipe = row[1]?.trim(); const sourceInside = normalized(row[3] || "").replace(/or/g, ""); const [thickness, outsideDiameter, packRunningMetres] = [numberValue(row[2]), numberValue(row[4]), numberValue(row[6])];
      matching = variants.filter((variant) => {
        const size = normalized(variant.size); const pipeMatches = !pipe || size.startsWith(`${normalized(pipe)}in`); const insideMatches = sourceInside && size.includes(`${sourceInside}mmid`); const outsideMatches = outsideDiameter === undefined ? size.includes("odtobeconfirmed") : size.includes(`${outsideDiameter}mmod`);
        return thickness !== undefined && packRunningMetres !== undefined && variant.thickness === `${thickness} mm` && variant.packRunningMetres === packRunningMetres && pipeMatches && Boolean(insideMatches) && outsideMatches;
      });
      rateFor = (variant) => numberValue(row[{ Plain: 16, "AL foil": 17, "GC cloth": 18 }[variant.lamination] ?? -1]);
    }

    const source = sourceRecord(row); const issue = "Mapped from the supplier product dimensions and final-rate column. Verify before confirming.";
    if (!matching.length) {
      candidates.push({ sourceRow, sheetName: sheet.name, source, confidence: "review", issues: [issue, "No RAC tube configuration matches the source dimensions and packing."] });
      return;
    }
    matching.forEach((variant) => {
      const rate = rateFor(variant);
      candidates.push({ sourceRow, sheetName: sheet.name, source, variant, rate, confidence: "review", issues: [issue, ...(rate === undefined ? ["A valid final rate was not found for this lamination."] : [])] });
    });
  });
  return candidates;
}

function normalized(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, ""); }

function adhesiveCandidates(sheet: WorkbookSheet): SourceCandidate[] {
  let currentGrade = ""; const variants = productVariants("insulation-adhesive"); const candidates: SourceCandidate[] = [];
  sheet.rows.forEach((row, index) => {
    const rate = numberValue(row[3]); if (rate === undefined) return;
    if (row[1]?.trim()) currentGrade = row[1].trim();
    const litres = numberValue(row[2]); const variant = litres === undefined ? undefined : variants.find((item) => normalized(item.materialClass) === normalized(currentGrade) && item.size.startsWith(`${litres} L`));
    candidates.push({ sourceRow: index + 1, sheetName: sheet.name, source: sourceRecord(row), variant, rate, confidence: "high", issues: [...(!currentGrade ? ["The adhesive grade is missing from this merged product group."] : []), ...(litres === undefined ? ["The drum size is missing or invalid."] : []), ...(!variant && currentGrade && litres !== undefined ? ["No RAC adhesive configuration matches this grade and drum size."] : [])] });
  });
  return candidates;
}

function tapeCandidates(sheet: WorkbookSheet): SourceCandidate[] {
  let currentType = ""; const variants = productVariants("insulation-tape"); const candidates: SourceCandidate[] = [];
  sheet.rows.forEach((row, index) => {
    const rate = numberValue(row[4]); if (rate === undefined) return;
    if (row[1]?.trim()) currentType = row[1].trim();
    const width = numberValue(row[2]); const length = numberValue(row[3]); const variant = width === undefined || length === undefined ? undefined : variants.find((item) => normalized(item.materialClass) === normalized(currentType) && item.size.startsWith(`${width} mm width × ${length} m`));
    candidates.push({ sourceRow: index + 1, sheetName: sheet.name, source: sourceRecord(row), variant, rate, confidence: "high", issues: [...(!currentType ? ["The tape type is missing from this merged product group."] : []), ...(width === undefined || length === undefined ? ["The tape width or roll length is missing or invalid."] : []), ...(!variant && currentType && width !== undefined && length !== undefined ? ["No RAC tape configuration matches this type, width and roll length."] : [])] });
  });
  return candidates;
}

function sheetCandidates(sheets: WorkbookSheet[]) {
  const candidates: SourceCandidate[] = [];
  const sections: Array<{ productId: "nitrile-rubber-sheet" | "xlpe-sheet"; materialClass: string; laminations: string[] }> = [
    { productId: "nitrile-rubber-sheet", materialClass: "Class I", laminations: ["Plain", "AL foil", "GC cloth"] },
    { productId: "nitrile-rubber-sheet", materialClass: "Class O", laminations: ["Plain", "AL foil", "GC cloth"] },
    { productId: "xlpe-sheet", materialClass: "Class I", laminations: ["Plain", "AL foil", "Met Pet foil"] },
    { productId: "xlpe-sheet", materialClass: "Class O", laminations: ["AL foil", "GC cloth"] },
  ];
  let sectionIndex = -1; let previousRow = -10;
  sheets.forEach((sheet) => sheet.rows.forEach((row, index) => {
    const thickness = numberValue(row[0]); const width = numberValue(row[2]); const length = numberValue(row[3]); const openCellRate = numberValue(row[7]); const sourceRow = index + 1;
    if (thickness !== undefined && width === 1 && length === 1 && openCellRate !== undefined) {
      const variant = productVariants("open-cell-nitrile-rubber-sheet").find((item) => item.thickness.startsWith(`${thickness} mm`));
      candidates.push({ sourceRow, sheetName: sheet.name, source: sourceRecord(row), variant, rate: openCellRate, confidence: "review", issues: ["Mapped from the recognised open-cell sheet rate table. Verify the packing and rate before confirming.", ...(!variant ? ["No RAC open-cell configuration exists for this source thickness."] : [])] });
      return;
    }
    const rates = [numberValue(row[7]), numberValue(row[9]), numberValue(row[11])];
    if (thickness === undefined || rates.filter((rate) => rate !== undefined).length < 2) return;
    if (index - previousRow > 2) sectionIndex += 1; previousRow = index;
    const section = sections[sectionIndex];
    if (!section) { candidates.push({ sourceRow, sheetName: sheet.name, source: sourceRecord(row), confidence: "review", issues: ["This sheet-rate table does not match an available RAC section. Add or correct a reusable import profile before importing it."] }); return; }
    const available = productVariants(section.productId).filter((variant) => variant.materialClass === section.materialClass && variant.thickness.startsWith(`${thickness} mm`));
    section.laminations.forEach((lamination, laminationIndex) => {
      const variant = available.find((item) => item.lamination === lamination); const rate = rates[laminationIndex];
      candidates.push({ sourceRow, sheetName: sheet.name, source: sourceRecord(row), variant, rate, confidence: "review", issues: ["Mapped from the recognised sheet rate-table section. Verify the class, lamination and rate before confirming.", ...(!variant ? ["No RAC configuration exists for this source thickness and lamination."] : []), ...(rate === undefined ? ["A final rate is missing for this source lamination."] : [])] });
    });
  }));
  return candidates;
}

function findPrimarySheet(sheets: WorkbookSheet[]) { return sheets.find((sheet) => sheet.rows.some((row) => row.some((cell) => cell))) || sheets[0]; }

function detectProfile(fileName: string, requested: RateImportProfileId, sheets: WorkbookSheet[]): Exclude<RateImportProfileId, "auto"> {
  if (requested !== "auto") return requested;
  const text = `${fileName} ${sheets.flatMap((sheet) => sheet.rows.slice(0, 4).flat()).join(" ")}`.toLowerCase();
  if (text.includes("adhesive")) return "insulation-adhesive";
  if (text.includes("tape")) return "insulation-tape";
  if (text.includes("xlpe") && text.includes("tube")) return "xlpe-tubes";
  if (text.includes("nitrile") && text.includes("class 1")) return "nitrile-tube-class-1";
  if (text.includes("nitrile") && (text.includes("class o") || text.includes("class 0"))) return "nitrile-tube-class-o";
  return "sheet-insulation";
}

function candidatesFor(profile: Exclude<RateImportProfileId, "auto">, sheet: WorkbookSheet): SourceCandidate[] {
  if (profile === "insulation-adhesive") return adhesiveCandidates(sheet);
  if (profile === "insulation-tape") return tapeCandidates(sheet);
  if (profile === "xlpe-tubes") return tubeCandidates(sheet, "xlpe-tube");
  if (profile === "nitrile-tube-class-1") return tubeCandidates(sheet, "nitrile-rubber-tube-class-1");
  if (profile === "nitrile-tube-class-o") return tubeCandidates(sheet, "nitrile-rubber-tube");
  return [];
}

function configurationKey(value: Pick<ImportedRateConfiguration, "productSlug" | "materialClass" | "thickness" | "sizeLabel" | "lamination">) {
  return [value.productSlug, value.materialClass, value.thickness, value.sizeLabel, value.lamination].map((item) => item.trim().toLowerCase()).join("|");
}

function analyseCandidates(candidates: SourceCandidate[], existing: QuotationRateCardRecord[]): RateImportRow[] {
  const known = new Map(existing.map((card) => [configurationKey(card), card])); const seen = new Set<string>();
  return candidates.map((candidate, index) => {
    const issues = [...candidate.issues];
    if (!candidate.variant || candidate.rate === undefined || !Number.isFinite(candidate.rate) || candidate.rate <= 0) return { id: `row-${index + 1}`, sourceRow: candidate.sourceRow, sheetName: candidate.sheetName, source: candidate.source, action: "invalid", confidence: candidate.confidence, issues: [...issues, ...(candidate.variant ? [] : ["No RAC configuration matched this row."]), ...(candidate.rate && candidate.rate <= 0 ? ["Rate must be greater than zero."] : [])] };
    const mapping = variantConfiguration(candidate.variant, candidate.rate); const key = configurationKey(mapping);
    if (seen.has(key)) return { id: `row-${index + 1}`, sourceRow: candidate.sourceRow, sheetName: candidate.sheetName, source: candidate.source, mapping, action: "duplicate", confidence: candidate.confidence, issues: [...issues, "Duplicate configuration in this import. The first mapped row is retained."], oldRate: known.get(key)?.rate, existingRateCardId: known.get(key)?.id };
    seen.add(key); const current = known.get(key);
    if (!current) return { id: `row-${index + 1}`, sourceRow: candidate.sourceRow, sheetName: candidate.sheetName, source: candidate.source, mapping, action: "create", confidence: candidate.confidence, issues };
    const sameRate = Math.abs(current.rate - candidate.rate) < 0.00001;
    if (sameRate && current.active) return { id: `row-${index + 1}`, sourceRow: candidate.sourceRow, sheetName: candidate.sheetName, source: candidate.source, mapping, action: "unchanged", confidence: candidate.confidence, issues, oldRate: current.rate, existingRateCardId: current.id };
    return { id: `row-${index + 1}`, sourceRow: candidate.sourceRow, sheetName: candidate.sheetName, source: candidate.source, mapping, action: "update", confidence: candidate.confidence, issues, oldRate: current.rate, existingRateCardId: current.id, reactivate: !current.active };
  });
}

export function analyseXlsxRateList(input: { fileName: string; bytes: Uint8Array; requestedProfile: RateImportProfileId; existing: QuotationRateCardRecord[] }): RateImportAnalysis {
  if (!input.fileName.toLowerCase().endsWith(".xlsx")) throw new Error("Upload an .xlsx rate list. Legacy .xls files must be saved as .xlsx first.");
  if (!input.bytes.byteLength) throw new Error("The uploaded workbook is empty.");
  if (input.bytes.byteLength > 10 * 1024 * 1024) throw new Error("Rate-list uploads must be 10 MB or smaller.");
  const sheets = readWorkbook(input.bytes); const profileId = detectProfile(input.fileName, input.requestedProfile, sheets); const candidates = profileId === "sheet-insulation" ? sheetCandidates(sheets) : candidatesFor(profileId, findPrimarySheet(sheets)); const rows = analyseCandidates(candidates, input.existing);
  const summary: Record<RateImportAction, number> = { create: 0, update: 0, unchanged: 0, invalid: 0, duplicate: 0 }; rows.forEach((row) => { summary[row.action] += 1; });
  return { id: createHash("sha256").update(`${input.fileName}:${Date.now()}:${Math.random()}`).digest("hex").slice(0, 24), fileName: input.fileName, fileSize: input.bytes.byteLength, fileHash: createHash("sha256").update(input.bytes).digest("hex"), profileId, profileName: profileLabel(profileId), analysedAt: new Date().toISOString(), sheets: sheets.map((sheet) => sheet.name), rows, summary };
}
