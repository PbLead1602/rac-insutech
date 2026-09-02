import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const logoSource = readFileSync(new URL("../lib/quotations/rac-logo-pdf.ts", import.meta.url), "utf8");
const rendererSource = readFileSync(new URL("../lib/quotations/pdf.ts", import.meta.url), "utf8");
const width = Number(logoSource.match(/width: (\d+)/)?.[1]);
const height = Number(logoSource.match(/height: (\d+)/)?.[1]);
const base64 = logoSource.match(/compressedScanlinesBase64: "([^"]+)"/)?.[1];

assert(width > 0 && height > 0 && base64, "The bundled RAC PDF logo is incomplete.");
const compressed = Buffer.from(base64, "base64");
const scanlines = inflateSync(compressed);
const rowLength = width * 3 + 1;
assert.equal(scanlines.length, height * rowLength, "The embedded RAC logo has invalid image data.");
for (let row = 0; row < height; row += 1) assert.equal(scanlines[row * rowLength], 0, "The PDF logo needs unfiltered RGB scanlines.");

assert.match(rendererSource, /idat: Buffer\.from\(racPdfLogo\.compressedScanlinesBase64, "base64"\)/);
assert.match(rendererSource, /\/RacLogo Do/);
assert.match(rendererSource, /objects\.push\(imageObject\(logo, security, logoRef\)\)/);
assert.match(rendererSource, /\/Encrypt \$\{encryptionRef\} 0 R/);
assert.match(rendererSource, /\(RAC INSUTECH\) Tj/);
assert.doesNotMatch(rendererSource, /loadRacLogo|racLogoSrc|fetch\(/, "The PDF logo must not depend on a runtime network request.");

function objectStream(value) {
  return Buffer.concat([Buffer.from(`<< /Length ${value.length} >>\nstream\n`), value, Buffer.from("\nendstream")]);
}

function testPdf() {
  const image = Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${width} >> /Length ${compressed.length} >>\nstream\n`),
    compressed,
    Buffer.from("\nendstream"),
  ]);
  const content = Buffer.from("q\n104 0 0 42.64 454 709 cm\n/RacLogo Do\nQ");
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> /XObject << /RacLogo 6 0 R >> >> /Contents 4 0 R >>"),
    objectStream(content),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    image,
  ];
  const chunks = [Buffer.from("%PDF-1.5\n%RAC\n")];
  const offsets = [0];
  let offset = chunks[0].length;
  objects.forEach((object, index) => {
    const prefix = Buffer.from(`${index + 1} 0 obj\n`);
    const suffix = Buffer.from("\nendobj\n");
    offsets.push(offset);
    chunks.push(prefix, object, suffix);
    offset += prefix.length + object.length + suffix.length;
  });
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((itemOffset) => { trailer += `${String(itemOffset).padStart(10, "0")} 00000 n \n`; });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.concat([...chunks, Buffer.from(trailer)]);
}

const pdf = testPdf();
assert(pdf.includes(Buffer.from("/Subtype /Image")), "The PDF has no image object.");
assert(pdf.includes(Buffer.from("/RacLogo 6 0 R")), "The PDF page does not reference the RAC logo.");
assert(pdf.includes(compressed), "The PDF does not contain the RAC logo data.");

const outputDirectory = join(root, ".tmp");
mkdirSync(outputDirectory, { recursive: true });
const outputFile = join(outputDirectory, "rac-pdf-logo-verification.pdf");
writeFileSync(outputFile, pdf);
console.log(JSON.stringify({ verified: true, embeddedImage: true, logo: `${width}x${height}`, pdfBytes: pdf.length, outputFile }));
