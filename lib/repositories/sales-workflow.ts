import "server-only";

import type { EnquiryRecord, QuotationCustomer, QuotationRecord } from "@/lib/db/types";
import { findOrCreateCustomerForQuotation, getAdminCustomer } from "@/lib/repositories/customers";
import { createEnquiry, linkEnquiryToSales } from "@/lib/repositories/enquiries";
import { findOrCreateProjectForQuotation } from "@/lib/repositories/projects";
import { linkQuotationToSales } from "@/lib/repositories/quotations";

export type SalesLinks = {
  customerId: string;
  /** Present only when the matched customer already has a RAC portal account. */
  accountId?: string;
  projectId?: string;
  enquiryId?: string;
};

/**
 * Builds the canonical sales relationships for a quotation. Customer matching
 * uses phone, email or GSTIN; a project is created only when project details
 * were supplied, unless the Admin is converting an accepted quotation.
 */
export async function resolveSalesLinks(
  customer: QuotationCustomer,
  options: { enquiryId?: string; customerId?: string; forceProject?: boolean; fallbackProjectTitle?: string } = {},
): Promise<SalesLinks> {
  const selectedCustomer = options.customerId ? await getAdminCustomer(options.customerId) : null;
  if (options.customerId && !selectedCustomer) throw new Error("The selected customer record could not be found.");
  const customerResult = selectedCustomer ? { customer: selectedCustomer.customer } : await findOrCreateCustomerForQuotation(customer);
  const projectResult = await findOrCreateProjectForQuotation({
    customer,
    customerId: customerResult.customer.id,
    force: options.forceProject,
    fallbackTitle: options.fallbackProjectTitle,
  });
  return { customerId: customerResult.customer.id, accountId: customerResult.customer.accountId, projectId: projectResult?.project.id, enquiryId: options.enquiryId };
}

/**
 * A quotation is always visible in the customer's sales history. When it did
 * not originate from an RFQ, create the lightweight enquiry record that ties
 * the new quote, project and customer together.
 */
export async function createQuotationEnquiry(
  customer: QuotationCustomer,
  links: Pick<SalesLinks, "customerId" | "accountId">,
  details: { product?: string; quantity?: string; source?: "customer" | "admin" } = {},
): Promise<EnquiryRecord> {
  const result = await createEnquiry({
    name: customer.fullName,
    company: customer.company,
    mobile: customer.mobile,
    email: customer.email,
    city: customer.city,
    state: customer.state,
    pinCode: customer.pinCode,
    projectName: customer.projectName,
    projectLocation: customer.projectLocation,
    product: details.product || "Quotation configuration",
    quantity: details.quantity || "As per quotation",
    customerType: customer.customerType,
    deliveryPreference: customer.deliveryPreference,
    message: details.source === "admin"
      ? "Quotation prepared by RAC Admin."
      : "Quotation prepared from the RAC customer portal.",
  }, undefined, links);
  return result.enquiry;
}

/** Persists the relationships after the quotation itself has been created. */
export async function finaliseQuotationSalesLinks(quotation: QuotationRecord, links: SalesLinks): Promise<QuotationRecord> {
  const linkedQuotation = await linkQuotationToSales(quotation.id, links);
  if (!linkedQuotation) throw new Error("Could not link the quotation to Sales records.");
  if (links.enquiryId) await linkEnquiryToSales(links.enquiryId, links.customerId, links.projectId, "quoted");
  return linkedQuotation;
}

/** Records the actual email event only after Brevo accepts the customer email. */
export async function markQuotationSalesEmailSent(quotation: QuotationRecord): Promise<void> {
  if (quotation.enquiryId && quotation.customerId) {
    await linkEnquiryToSales(quotation.enquiryId, quotation.customerId, quotation.projectId, "quotation_sent");
  }
}

/** Creates a project for an accepted order if no project was available earlier. */
export async function convertAcceptedQuotationToProject(quotation: QuotationRecord): Promise<QuotationRecord> {
  const links = await resolveSalesLinks(quotation.customer, {
    enquiryId: quotation.enquiryId,
    forceProject: true,
    fallbackProjectTitle: quotation.customer.projectName || `${quotation.customer.company || quotation.customer.fullName} — ${quotation.quoteNumber}`,
  });
  return finaliseQuotationSalesLinks(quotation, links);
}
