import "server-only";

import type { QuotationCustomer, QuotationRecord } from "@/lib/db/types";
import { findOrCreateCustomerForQuotation } from "@/lib/repositories/customers";
import { linkEnquiryToSales } from "@/lib/repositories/enquiries";
import { findOrCreateProjectForQuotation } from "@/lib/repositories/projects";
import { linkQuotationToSales } from "@/lib/repositories/quotations";

export type SalesLinks = {
  customerId: string;
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
  options: { enquiryId?: string; forceProject?: boolean; fallbackProjectTitle?: string } = {},
): Promise<SalesLinks> {
  const customerResult = await findOrCreateCustomerForQuotation(customer);
  const projectResult = await findOrCreateProjectForQuotation({
    customer,
    customerId: customerResult.customer.id,
    force: options.forceProject,
    fallbackTitle: options.fallbackProjectTitle,
  });
  return { customerId: customerResult.customer.id, projectId: projectResult?.project.id, enquiryId: options.enquiryId };
}

/** Persists the relationships after the quotation itself has been created. */
export async function finaliseQuotationSalesLinks(quotation: QuotationRecord, links: SalesLinks): Promise<QuotationRecord> {
  const linkedQuotation = await linkQuotationToSales(quotation.id, links);
  if (!linkedQuotation) throw new Error("Could not link the quotation to Sales records.");
  if (links.enquiryId) await linkEnquiryToSales(links.enquiryId, links.customerId, links.projectId);
  return linkedQuotation;
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
