import assert from "node:assert/strict";
import { fetchApprovedRateLookup } from "../lib/quotations/rate-lookup-client";

// The lookup module is browser-only. Node provides the same timer primitives
// for this focused contract test.
Object.assign(globalThis, { window: globalThis });

let requests = 0;
const request = async () => {
  requests += 1;
  await new Promise((resolve) => setTimeout(resolve, 5));
  return new Response(JSON.stringify({
    ok: true,
    rates: [{ variantId: "rate-a", available: true, rate: 118.46, rateUnit: "square metre" }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const options = {
  request,
  endpoint: "/api/quotation-rates",
  variantIds: ["rate-a"],
  expiredSessionMessage: "Session expired.",
};

const [first, second] = await Promise.all([
  fetchApprovedRateLookup(options),
  fetchApprovedRateLookup({ ...options, variantIds: ["rate-a", "rate-a"] }),
]);

assert.equal(requests, 1, "identical in-flight rate lookups must share one request");
assert.equal(first.rates[0]?.rate, 118.46);
assert.equal(second.rates[0]?.rateUnit, "square metre");

await fetchApprovedRateLookup(options);
assert.equal(requests, 2, "completed lookups must not be cached as commercial pricing");

console.log("Rate lookup request coalescing tests passed.");
