import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const rendererSource = readFileSync(new URL("../lib/quotations/pdf.ts", import.meta.url), "utf8");
assert.match(rendererSource, /\(RAC INSUTECH\) Tj/, "The PDF watermark is missing.");
assert.match(rendererSource, /const permissions = -3904/, "PDF copy, printing, editing and extraction restrictions are missing.");
assert.match(rendererSource, /globalThis\.crypto\.getRandomValues/, "The PDF protection key must be cryptographically random.");

const bundleDirectory = resolve("dist/server/_next/static");
const bundleName = readdirSync(bundleDirectory).find((file) => file.startsWith("pdf-") && file.endsWith(".js"));
assert(bundleName, "Build the production bundle before running this verification.");
const bundle = await import(pathToFileURL(resolve(bundleDirectory, bundleName)).href);
const render = Object.values(bundle).find((value) => typeof value === "function");
assert(render, "The PDF renderer could not be loaded from the production bundle.");

const quotation = {
  id: "security-test",
  quoteNumber: "RAC-Q-SECURITY-TEST",
  accessToken: "security-test",
  customer: { fullName: "Example Customer", company: "Example Company", mobile: "9999999999", email: "example@example.com" },
  items: [{ variantId: "test", productName: "Nitrile Rubber Sheet", configuration: "Class O | 25 mm | Plain", requestedQuantity: 1, requestedUnit: "roll", suppliedQuantity: 1, suppliedUnit: "roll", technicalQuantity: "1 roll", rate: 100, rateUnit: "per roll", amount: 100, provisional: true }],
  subtotal: 100,
  gstRate: 18,
  gstAmount: 18,
  total: 118,
  transport: "At Actual",
  paymentTerms: "Advance",
  validityDays: 7,
  status: "generated",
  isProvisional: true,
  createdAt: "2026-09-02T00:00:00.000Z",
};

const pdf = render(quotation);
const content = pdf.toString("latin1");
assert.match(content, /\/Filter \/Standard/);
assert.match(content, /\/Encrypt \d+ 0 R/);
assert.match(content, /\/P -3904/);
assert(!content.includes("Example Customer") && !content.includes("Nitrile Rubber Sheet"), "Quotation content must be encrypted in the generated PDF.");
console.log(JSON.stringify({ verified: true, encrypted: true, permissions: "copy/extract/edit/print disabled", watermark: "RAC INSUTECH", pdfBytes: pdf.length }));
