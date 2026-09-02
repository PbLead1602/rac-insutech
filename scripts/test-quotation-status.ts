import assert from "node:assert/strict";
import type { QuotationRecord } from "../lib/db/types";
import { nextQuotationStatusForPatch, quotationShouldExpire, quotationStatusLabel } from "../lib/quotations/status";

const quotation = (status: QuotationRecord["status"], validUntil = "2099-09-30") => ({ status, validUntil }) as QuotationRecord;

assert.equal(quotationStatusLabel("generated"), "Generated");
assert.equal(quotationStatusLabel("revision_requested"), "Revision requested");
assert.equal(nextQuotationStatusForPatch(quotation("sent"), { followUpAt: "2026-10-10T10:00:00.000Z" }), "follow_up");
assert.equal(nextQuotationStatusForPatch(quotation("won"), { followUpAt: "2026-10-10T10:00:00.000Z" }), undefined);
assert.equal(nextQuotationStatusForPatch(quotation("sent"), { status: "accepted" }), "accepted");
assert.equal(quotationShouldExpire(quotation("sent", "2026-09-01"), "2026-09-02"), true);
assert.equal(quotationShouldExpire(quotation("won", "2026-09-01"), "2026-09-02"), false);

console.log("Quotation lifecycle status tests passed.");
