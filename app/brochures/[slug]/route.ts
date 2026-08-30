import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getProduct } from "@/lib/catalogue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfPng = { width: number; height: number; compressedData: Buffer };
type PdfPage = { width: number; height: number; content: string };
type Product = NonNullable<ReturnType<typeof getProduct>>;
type SummarySection = { title: string; lines: string[] };
type TechnicalRow =
  | { kind: "section"; label: string; height: number }
  | { kind: "data"; cells: string[][]; height: number };

const portrait = { width: 612, height: 792 };
const landscape = { width: 792, height: 612 };
let cachedRacLogo: PdfPng | undefined;

function pdfSafe(value: string) {
  return value
    .replace(/[()\\]/g, "\\$&")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^ -~]/g, "");
}

function wrap(text: string, length = 76) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > length && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function getRacLogo(): PdfPng {
  if (cachedRacLogo) return cachedRacLogo;
  const png = readFileSync(join(process.cwd(), "public", "assets", "logo", "rac-logo.png"));
  if (png.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("RAC logo is not a PNG file.");
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 2) throw new Error("RAC logo requires an 8-bit RGB PNG.");
  const idat: Buffer[] = [];
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  if (!idat.length) throw new Error("RAC logo image data is missing.");
  cachedRacLogo = { width, height, compressedData: Buffer.concat(idat) };
  return cachedRacLogo;
}

function streamObject(content: string | Buffer) {
  const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return Buffer.concat([Buffer.from(`<< /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream")]);
}

function pngObject(image: PdfPng) {
  const prefix = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${image.width} >> /Length ${image.compressedData.length} >>\nstream\n`;
  return Buffer.concat([Buffer.from(prefix), image.compressedData, Buffer.from("\nendstream")]);
}

function addText(commands: string[], lines: string[], x: number, y: number, size: number, colour: string, leading = 10) {
  commands.push("BT", `/F1 ${size} Tf`, colour, `${x} ${y} Td`, `${leading} TL`);
  lines.forEach((line) => commands.push(`(${pdfSafe(line)}) Tj`, "T*"));
  commands.push("ET");
}

function addBrand(commands: string[], width: number, height: number, pageNumber: number, pageCount: number) {
  commands.push("q", "0.96 0.98 1 rg", `0 0 ${width} ${height} re`, "f", "Q");
  commands.push("q", `128 0 0 96 ${width - 180} ${height - 126} cm`, "/RacLogo Do", "Q");
  addText(commands, ["RAC INSUTECH | PRODUCT BRIEF"], 52, height - 38, 9.2, "0.025 0.31 0.63 rg");
  addText(commands, ["Insulate. Optimise. Perform."], 52, 29, 6.7, "0.04 0.43 0.65 rg");
  addText(commands, [`Page ${pageNumber} of ${pageCount}`], width - 105, 29, 6.7, "0.3 0.4 0.52 rg");
}

function createPdf(pages: PdfPage[]) {
  const logo = getRacLogo();
  const pageRefs = pages.map((_, index) => 3 + index * 2);
  const fontRef = 3 + pages.length * 2;
  const logoRef = fontRef + 1;
  const objects: Array<string | Buffer> = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  ];
  pages.forEach((page, index) => {
    const pageRef = pageRefs[index];
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRef} 0 R >> /XObject << /RacLogo ${logoRef} 0 R >> >> /Contents ${pageRef + 1} 0 R >>`);
    objects.push(streamObject(page.content));
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(pngObject(logo));

  const chunks: Buffer[] = [Buffer.from("%PDF-1.5\n%RAC\n", "utf8")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    const prefix = Buffer.from(`${index + 1} 0 obj\n`);
    const body = Buffer.isBuffer(object) ? object : Buffer.from(object, "utf8");
    const suffix = Buffer.from("\nendobj\n");
    offsets.push(length);
    chunks.push(prefix, body, suffix);
    length += prefix.length + body.length + suffix.length;
  });
  const xrefOffset = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { trailer += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(Buffer.from(trailer, "utf8"));
  return Buffer.concat(chunks);
}

function getSummarySections(product: Product): SummarySection[] {
  const sections: SummarySection[] = [
    { title: "DESCRIPTION", lines: wrap(product.shortDescription, 78) },
    { title: "MATERIAL OVERVIEW", lines: wrap(product.overview, 78) },
    { title: "KEY BENEFITS", lines: product.keyBenefits.flatMap((benefit) => wrap(`- ${benefit}`, 74)) },
    { title: "AVAILABLE FORMS", lines: product.availableForms.flatMap((form) => wrap(`- ${form}`, 74)) },
  ];
  if (!product.technicalData?.length) {
    sections.push({
      title: "TECHNICAL REFERENCE",
      lines: ["Product-specific technical values should be confirmed against the approved material submittal before ordering or installation."],
    });
  }
  return sections;
}

function summarySectionHeight(section: SummarySection) {
  return 19 + section.lines.length * 10.8 + 10;
}

function paginateSummary(sections: SummarySection[]) {
  const pages: SummarySection[][] = [[]];
  let used = 0;
  const available = 600;
  sections.forEach((section) => {
    const height = summarySectionHeight(section);
    if (pages.at(-1)!.length && used + height > available) {
      pages.push([]);
      used = 0;
    }
    pages.at(-1)!.push(section);
    used += height;
  });
  return pages;
}

function drawSummaryPage(product: Product, sections: SummarySection[], pageNumber: number, pageCount: number) {
  const commands: string[] = [];
  addBrand(commands, portrait.width, portrait.height, pageNumber, pageCount);
  addText(commands, [product.name], 52, 722, 21, "0.035 0.19 0.43 rg", 22);
  addText(commands, [product.family.toUpperCase()], 52, 695, 9.2, "0.02 0.49 0.79 rg");
  let top = 668;
  sections.forEach((section) => {
    addText(commands, [section.title], 52, top, 9.5, "0.02 0.42 0.84 rg");
    top -= 17;
    addText(commands, section.lines, 60, top, 9.1, "0.13 0.19 0.28 rg", 10.8);
    top -= section.lines.length * 10.8 + 10;
  });
  addText(commands, ["Selection guidance only - verify the final material and specification against approved project documentation."], 52, 46, 6.5, "0.3 0.4 0.52 rg");
  return { ...portrait, content: commands.join("\n") };
}

function getTechnicalRows(product: Product): TechnicalRow[] {
  const layout = { description: 33, standard: 24, unit: 10, value: 40, minimumHeight: 14, leading: 7.4, padding: 5.5 };
  const rows: TechnicalRow[] = (product.technicalData || []).map((item) => {
    if (item.isSection) return { kind: "section", label: item.description, height: 16 };
    const cells = [
      wrap(item.description, layout.description),
      wrap(item.standard || "-", layout.standard),
      wrap(item.unit || "-", layout.unit),
      wrap(item.value || "-", layout.value),
    ];
    return { kind: "data", cells, height: Math.max(layout.minimumHeight, Math.max(...cells.map((cell) => cell.length)) * layout.leading + layout.padding) };
  });
  if (product.technicalDataNote) {
    const cells = [wrap("Reference note", layout.description), ["-"], ["-"], wrap(product.technicalDataNote, layout.value)];
    rows.push({ kind: "data", cells, height: Math.max(layout.minimumHeight, Math.max(...cells.map((cell) => cell.length)) * layout.leading + layout.padding) });
  }
  return rows;
}

function paginateTechnicalRows(rows: TechnicalRow[]) {
  const pages: TechnicalRow[][] = [[]];
  let used = 20;
  const available = 420;
  rows.forEach((row) => {
    if (pages.at(-1)!.length && used + row.height > available) {
      pages.push([]);
      used = 20;
    }
    pages.at(-1)!.push(row);
    used += row.height;
  });
  return pages;
}

function drawTechnicalPage(product: Product, rows: TechnicalRow[], pageNumber: number, pageCount: number) {
  const commands: string[] = [];
  const columns = [42, 247, 408, 476, 750];
  const layout = { headerHeight: 20, leading: 7.4, cellFontSize: 6.7, sectionFontSize: 7.4, padding: 5.5 };
  addBrand(commands, landscape.width, landscape.height, pageNumber, pageCount);
  addText(commands, [product.name], 42, 550, 20, "0.035 0.19 0.43 rg", 21);
  addText(commands, ["TECHNICAL REFERENCE"], 42, 523, 9.8, "0.02 0.49 0.79 rg");

  let top = 500;
  commands.push("q", "0.035 0.19 0.43 rg", `${columns[0]} ${top - layout.headerHeight} ${columns[4] - columns[0]} ${layout.headerHeight} re`, "f", "Q");
  ["Description", "Test Standard", "UOM", "Reference Value"].forEach((label, index) => addText(commands, [label], columns[index] + 7, top - 13, 7.3, "1 1 1 rg"));
  top -= layout.headerHeight;

  rows.forEach((row) => {
    const bottom = top - row.height;
    if (row.kind === "section") {
      commands.push("q", "0.9 0.96 1 rg", `${columns[0]} ${bottom} ${columns[4] - columns[0]} ${row.height} re`, "f", "Q", "q", "0.55 0.76 0.93 RG", "0.5 w", `${columns[0]} ${bottom} ${columns[4] - columns[0]} ${row.height} re`, "S", "Q");
      addText(commands, wrap(row.label, 84), columns[0] + 7, top - row.height + 5, layout.sectionFontSize, "0.02 0.37 0.71 rg", layout.leading);
    } else {
      commands.push("q", "1 1 1 rg", `${columns[0]} ${bottom} ${columns[4] - columns[0]} ${row.height} re`, "f", "Q", "q", "0.79 0.86 0.93 RG", "0.45 w");
      for (let index = 0; index < 4; index += 1) commands.push(`${columns[index]} ${bottom} ${columns[index + 1] - columns[index]} ${row.height} re`, "S");
      commands.push("Q");
      row.cells.forEach((cell, index) => addText(commands, cell, columns[index] + 7, top - layout.padding - 3, layout.cellFontSize, index === 3 ? "0.035 0.19 0.43 rg" : "0.18 0.29 0.42 rg", layout.leading));
    }
    top = bottom;
  });
  addText(commands, ["Technical values are selection guidance. Confirm the final specification against approved manufacturer documentation."], 42, 46, 6.5, "0.3 0.4 0.52 rg");
  return { ...landscape, content: commands.join("\n") };
}

function createProductPdf(product: Product) {
  const summaryPages = paginateSummary(getSummarySections(product));
  const technicalPages = product.technicalData?.length ? paginateTechnicalRows(getTechnicalRows(product)) : [];
  const pageCount = summaryPages.length + technicalPages.length;
  return createPdf([
    ...summaryPages.map((sections, index) => drawSummaryPage(product, sections, index + 1, pageCount)),
    ...technicalPages.map((rows, index) => drawTechnicalPage(product, rows, summaryPages.length + index + 1, pageCount)),
  ]);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return new Response("Product brief not found.", { status: 404 });
  const filename = `rac-insutech-${product.slug}-product-brief.pdf`;
  return new Response(createProductPdf(product), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
