import type { QuotationRecord, QuotationStatus } from "@/lib/db/types";

/**
 * One authoritative lifecycle vocabulary for the Admin and customer portals.
 * A quotation always has one current status; operational timestamps preserve
 * the relevant actions (for example, sent and viewed) without inventing a
 * combined status such as "generated and sent".
 */
export const quotationStatusOptions: ReadonlyArray<{ value: QuotationStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "generated", label: "Generated" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "follow_up", label: "Follow-up" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "revised", label: "Revised" },
  { value: "accepted", label: "Accepted" },
  { value: "po_received", label: "PO received" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export function quotationStatusLabel(status: QuotationStatus | string | undefined) {
  return quotationStatusOptions.find((option) => option.value === status)?.label || String(status || "generated").replaceAll("_", " ");
}

export const quotationTerminalStatuses = new Set<QuotationStatus>(["accepted", "po_received", "won", "lost", "expired", "cancelled"]);
const expirableStatuses = new Set<QuotationStatus>(["generated", "sent", "viewed", "follow_up", "revision_requested", "revised"]);

/** A manual follow-up belongs to the active commercial lifecycle, not a final outcome. */
export function nextQuotationStatusForPatch(current: QuotationRecord, patch: { status?: QuotationStatus; followUpAt?: string }) {
  if (patch.status) return patch.status;
  if (patch.followUpAt && !quotationTerminalStatuses.has(current.status)) return "follow_up" as const;
  return undefined;
}

/** Lifecycle expiry is evaluated against the customer's local calendar date. */
export function quotationShouldExpire(quotation: Pick<QuotationRecord, "status" | "validUntil">, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(quotation.validUntil && quotation.validUntil < today && expirableStatuses.has(quotation.status));
}
