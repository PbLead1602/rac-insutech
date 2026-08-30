import "server-only";

import type { CustomerRevisionRequest, EnquiryRecord, QuotationRecord } from "@/lib/db/types";

/** Removes Admin-only fields before a record crosses the customer API boundary. */
export function toCustomerEnquiry(enquiry: EnquiryRecord) {
  const { accountId, customerId, projectId, followUpAt, followUpNote, internalNotes, lostReason, turnstileToken, ...safeEnquiry } = enquiry;
  return safeEnquiry;
}

/** The quotation snapshot stays customer-visible; staff notes and bearer tokens never do. */
export function toCustomerQuotation(quotation: QuotationRecord) {
  const {
    accessToken, accountId, customerId, projectId, enquiryId, source, parentQuotationId,
    followUpAt, followUpNote, internalNotes, lostReason, lastSentAt, lastViewedAt,
    ...safeQuotation
  } = quotation;
  return safeQuotation;
}

/** The account overview needs only a commercial summary; line items load on the detail page. */
export function toCustomerQuotationSummary(quotation: QuotationRecord) {
  const { items, ...safeQuotation } = toCustomerQuotation(quotation);
  return { ...safeQuotation, items: [] };
}

export function toCustomerRevisionRequest(request: CustomerRevisionRequest) {
  const { accountId, customerId, ...safeRequest } = request;
  return safeRequest;
}
