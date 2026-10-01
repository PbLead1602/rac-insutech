import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rfqSchema } from "../lib/validation/rfq";

const parsed = rfqSchema.safeParse({
  name: "RAC Test",
  mobile: "+919999999999",
  turnstileToken: "test-turnstile-token",
});

assert.equal(parsed.success, true, "RFQ validation must accept the Turnstile token supplied by the public form.");
if (parsed.success) assert.equal(parsed.data.turnstileToken, "test-turnstile-token");

const route = readFileSync(resolve(process.cwd(), "app/api/rfq/route.ts"), "utf8");
assert.match(route, /import \{ verifyTurnstile \} from "@\/lib\/services\/turnstile"/);
assert.match(route, /await verifyTurnstile\(\s*payload\.data\.turnstileToken/);

console.log("RFQ spam-protection regression checks passed.");
