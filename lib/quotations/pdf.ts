import "server-only";

import type { QuotationRecord } from "@/lib/db/types";
import { racPdfLogo } from "@/lib/quotations/rac-logo-pdf";

const safe = (value: string) => value.replace(/[()\\]/g, "\\$&").replace(/[^ -~]/g, "-");
const money = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
type PngImage = { width: number; height: number; idat: Buffer };
// The renderer must never depend on an HTTP request for branding. The exact
// RAC asset is compacted at build time and embedded in every generated PDF.
const racLogo: PngImage = {
  width: racPdfLogo.width,
  height: racPdfLogo.height,
  idat: Buffer.from(racPdfLogo.compressedScanlinesBase64, "base64"),
};

const companyHeader = [
  "RAC INSUTECH",
  "Rukhmini Niwas, Near Vrundavan Garden",
  "Appt. Behind Tulshan Bungalow, Geeta",
  "Nagar, Akola",
  "Visit: www.racinsutech.com",
  "Phone no.: 9130958594",
  "Email: racinsutech@gmail.com",
  "GSTIN: 27AKLPL9475H1ZH",
  "State: 27-Maharashtra",
];

const quotationTerms = [
  "1. Payment terms: 100% Advance along with Order.",
  "2. Order through dealer only.",
  "3. Delivery period: within 7 to 8 working days after confirmation of payment receipt.",
  "4. Unloading at customer side.",
  "5. Transportation at actual.",
  "6. Prices are Basic Ex-works + 18% GST Extra + Transportation at actual.",
  "7. MOQ: As per standard packing.",
  "8. Thickness tolerance: +/- 1 mm.",
  "9. Validity: This offer is valid only for 7 days from the date of quotation.",
];

function lines(value: string, width = 80) {
  const words = value.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let line = "";
  words.forEach((word) => {
    if (line && `${line} ${word}`.length > width) { result.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  });
  if (line) result.push(line);
  return result;
}

/** Older custom NBR snapshots predate pipe length in configuration text. */
function displayedConfiguration(item: QuotationRecord["items"][number]) {
  const custom = item.customBuiltUp;
  if (!custom || /pipe length/i.test(item.configuration)) return item.configuration;
  const pipe = `${custom.baseDiameterMm} mm pipe`;
  const withLength = `${pipe} | ${custom.pipeLengthM} m pipe length`;
  return item.configuration.includes(pipe) ? item.configuration.replace(pipe, withLength) : `${item.configuration} | ${custom.pipeLengthM} m pipe length`;
}

function text(command: string[], values: string[], x: number, y: number, size: number, color = "0.08 0.18 0.32 rg", leading = 10, font = "F1") {
  command.push("BT", `/${font} ${size} Tf`, color, `${x} ${y} Td`, `${leading} TL`);
  values.forEach((value) => command.push(`(${safe(value)}) Tj`, "T*"));
  command.push("ET");
}

function stream(value: string | Buffer) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from(`<< /Length ${data.length} >>\nstream\n`), data, Buffer.from("\nendstream")]);
}

function imageObject(image: PngImage) {
  const dictionary = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${image.width} >> /Length ${image.idat.length} >>\nstream\n`;
  return Buffer.concat([Buffer.from(dictionary), image.idat, Buffer.from("\nendstream")]);
}

function createPdf(contents: string[], logo: PngImage) {
  const pageRefs = contents.map((_, index) => 3 + index * 2);
  const fontRef = 3 + contents.length * 2;
  const boldFontRef = fontRef + 1;
  const logoRef = fontRef + 2;
  const objects: Array<string | Buffer> = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageRefs.map((reference) => `${reference} 0 R`).join(" ")}] /Count ${contents.length} >>`,
  ];
  contents.forEach((content, index) => {
    const pageRef = pageRefs[index];
    const imageResource = ` /XObject << /RacLogo ${logoRef} 0 R >>`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRef} 0 R /F2 ${boldFontRef} 0 R >>${imageResource} >> /Contents ${pageRef + 1} 0 R >>`, stream(content));
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(imageObject(logo));
  const chunks: Buffer[] = [Buffer.from("%PDF-1.5\n%RAC\n")];
  const offsets = [0];
  let length = chunks[0].length;
  objects.forEach((object, index) => {
    const prefix = Buffer.from(`${index + 1} 0 obj\n`);
    const body = Buffer.isBuffer(object) ? object : Buffer.from(object);
    const suffix = Buffer.from("\nendobj\n");
    offsets.push(length); chunks.push(prefix, body, suffix); length += prefix.length + body.length + suffix.length;
  });
  const start = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { trailer += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  chunks.push(Buffer.from(trailer));
  return Buffer.concat(chunks);
}

function drawQuotationPage(quotation: QuotationRecord, items: QuotationRecord["items"], itemOffset: number, pageNumber: number, pageCount: number, includeCustomer: boolean, isLastPage: boolean) {
  const command: string[] = [];
  const brand = "0.04 0.16 0.34 rg";
  const accent = "0.00 0.51 0.76 rg";
  const muted = "0.29 0.4 0.53 rg";
  command.push("q", "0.98 0.99 1 rg", "0 0 612 792 re", "f", "Q");
  // Header: editorial hierarchy on the left and one calm, aligned brand block on the right.
  command.push("q", "0.10 0.78 0.72 rg", "48 764 516 3 re", "f", "Q");
  command.push("q", "0.00 0.51 0.76 rg", "48 739 4 14 re", "f", "Q");
  text(command, ["COMMERCIAL QUOTATION"], 60, 746, 9.4, accent, 12, "F2");
  text(command, [quotation.quoteNumber], 48, 715, 22, brand, 24, "F2");
  command.push("q", "0.92 0.97 0.99 rg", "48 683 282 18 re", "f", "Q");
  text(command, [`Issued ${new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} | Valid for ${quotation.validityDays} days | Page ${pageNumber} of ${pageCount}`], 57, 690, 7.35, muted, 9);
  command.push("q", "0.95 0.99 0.99 rg", "365 628 199 136 re", "f", "Q", "q", "0.70 0.87 0.91 RG", "0.55 w", "365 628 199 136 re", "S", "Q", "q", "0.10 0.78 0.72 rg", "365 761 199 3 re", "f", "Q");
  command.push("q", "116 0 0 47.56 436 714 cm", "/RacLogo Do", "Q");
  text(command, [companyHeader[0]], 376, 702, 8.3, brand, 10, "F2");
  text(command, companyHeader.slice(1), 376, 690, 6.65, "0.18 0.29 0.43 rg", 8.05);
  let y = includeCustomer ? 550 : 625;
  if (includeCustomer) {
    command.push("q", "0.10 0.78 0.72 rg", "48 662 3 11 re", "f", "Q");
    text(command, ["CUSTOMER & PROJECT"], 58, 666, 8.4, accent, 10, "F2");
    text(command, [quotation.customer.fullName, quotation.customer.company, quotation.customer.email, quotation.customer.mobile, ...lines([quotation.customer.projectName, quotation.customer.projectLocation, quotation.customer.city].filter(Boolean).join(" | "), 47)], 48, 651, 8.05, "0.12 0.2 0.32 rg", 9.5);
  }
  command.push("q", "0.04 0.16 0.34 rg", `48 ${y - 20} 516 20 re`, "f", "Q", "q", "0.10 0.78 0.72 rg", `48 ${y - 2} 516 2 re`, "f", "Q");
  text(command, ["SR NO"], 55, y - 13, 7.1, "1 1 1 rg", 9, "F2");
  text(command, ["PRODUCT"], 80, y - 13, 7.1, "1 1 1 rg", 9, "F2");
  text(command, ["SUPPLY QUANTITY"], 334, y - 13, 7.1, "1 1 1 rg", 9, "F2");
  text(command, ["RATE"], 419, y - 13, 7.1, "1 1 1 rg", 9, "F2");
  text(command, ["AMOUNT"], 506, y - 13, 7.1, "1 1 1 rg", 9, "F2");
  items.forEach((item, index) => {
    const custom = item.customBuiltUp;
    // A custom built-up group retains a single product item while exposing the
    // quantity, rate and amount of every actual NBR Sheet layer.
    const rowHeight = custom ? Math.max(48, 28 + custom.layers.length * 14) : 40;
    // The first row clears the 20 pt table heading; later rows keep a 3 pt gap.
    y -= index === 0 ? rowHeight + 20 : rowHeight + 3;
    command.push("q", index % 2 === 0 ? "1 1 1 rg" : "0.97 0.99 1 rg", `48 ${y} 516 ${rowHeight} re`, "f", "Q", "q", "0.78 0.86 0.93 RG", "0.4 w", `48 ${y} 516 ${rowHeight} re`, "S", "Q");
    const textY = y + rowHeight - 12;
    text(command, [String(itemOffset + index + 1)], 55, textY, 7.3, "0.08 0.18 0.32 rg", 9, "F2");
    const configuration = displayedConfiguration(item);
    const productDetailLines = custom
      ? [item.productName, ...lines(configuration, 42), `Grouped basic total: ${money(item.amount)}`]
      : [item.productName, ...lines(configuration, 45)];
    text(command, [productDetailLines[0]], 80, textY, 7.35, "0.08 0.18 0.32 rg", 9, "F2");
    text(command, productDetailLines.slice(1), 80, textY - 9, 6.7, "0.29 0.4 0.53 rg", 8.2);
    if (custom) {
      text(command, custom.layers.map((layer) => `L${layer.layerNumber}: ${layer.quotedAreaM2.toFixed(2)} m2`), 334, textY, 7.1, "0.08 0.18 0.32 rg", 11.2);
      text(command, custom.layers.map((layer) => `L${layer.layerNumber}: ${money(layer.rate)}/m2`), 419, textY, 6.65, "0.08 0.18 0.32 rg", 11.2);
      text(command, custom.layers.map((layer) => `L${layer.layerNumber}: ${money(layer.amount)}`), 506, textY, 6.9, "0.04 0.16 0.34 rg", 11.2);
    } else {
      text(command, lines(item.technicalQuantity, 17), 334, textY, 7.2, "0.08 0.18 0.32 rg", 8.3);
      text(command, [money(item.rate), item.rateUnit], 419, textY, 6.8, "0.08 0.18 0.32 rg", 8);
      text(command, [money(item.amount)], 506, textY, 7.3, "0.04 0.16 0.34 rg", 9, "F2");
    }
  });
  if (isLastPage) {
    y -= 18;
    command.push("q", "0.93 0.98 0.98 rg", `376 ${y - 52} 188 66 re`, "f", "Q", "q", "0.70 0.87 0.91 RG", "0.5 w", `376 ${y - 52} 188 66 re`, "S", "Q");
    text(command, ["Subtotal", `GST (${quotation.gstRate}%)`, "Transport", "Grand total"], 390, y, 8.35, "0.2 0.29 0.4 rg", 16);
    text(command, [money(quotation.subtotal), money(quotation.gstAmount), "At Actual", money(quotation.total)], 493, y, 8.35, brand, 16, "F2");
    const termY = Math.max(142, y - 78);
    command.push("q", "0.10 0.78 0.72 rg", `48 ${termY - 3} 3 11 re`, "f", "Q");
    text(command, ["TERMS AND CONDITIONS"], 58, termY, 8.4, accent, 10, "F2");
    text(command, quotationTerms, 48, termY - 13, 6.65, "0.24 0.34 0.47 rg", 9);
  } else {
    text(command, ["Continued on next page."], 48, 57, 7.3, "0.29 0.4 0.53 rg");
  }
  command.push("q", "0.75 0.85 0.91 RG", "0.45 w", "48 42 m", "564 42 l", "S", "Q");
  text(command, ["RAC INSUTECH | +91 91309 58594 | racinsutech@gmail.com | www.racinsutech.com"], 48, 28, 6.8, muted);
  return command.join("\n");
}

export function createQuotationPdf(quotation: QuotationRecord) {
  const firstPageItems = quotation.items.slice(0, 7);
  const remainingItems = quotation.items.slice(7);
  const followingPages: QuotationRecord["items"][] = [];
  // Eight rows leave the final page enough vertical space for totals and all terms.
  for (let index = 0; index < remainingItems.length; index += 8) followingPages.push(remainingItems.slice(index, index + 8));
  const pages = [firstPageItems, ...followingPages];
  let itemOffset = 0;
  return createPdf(pages.map((items, index) => {
    const contents = drawQuotationPage(quotation, items, itemOffset, index + 1, pages.length, index === 0, index === pages.length - 1);
    itemOffset += items.length;
    return contents;
  }), racLogo);
}
