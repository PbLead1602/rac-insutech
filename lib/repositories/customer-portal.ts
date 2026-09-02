import "server-only";

import { randomUUID } from "crypto";
import type { CustomerRevisionRequest, DocumentRecord, EnquiryRecord, ProjectRecord, QuotationRecord } from "@/lib/db/types";
import type { CustomerAccountContext } from "@/lib/repositories/customer-accounts";
import { listAdminDocuments } from "@/lib/repositories/documents";
import { getAdminEnquiry, listAdminEnquiries } from "@/lib/repositories/enquiries";
import { createAdminProject, getAdminProject, listAdminProjects } from "@/lib/repositories/projects";
import { getAdminQuotation, listAdminQuotations, updateAdminQuotation } from "@/lib/repositories/quotations";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";
import { quotationStatusLabel } from "@/lib/quotations/status";

type RevisionStore = { requests: CustomerRevisionRequest[] };
function revisionStore() { return persistentDevelopmentStore<RevisionStore>("customer-revision-requests", () => ({ requests: [] })); }

export type CustomerPortalSnapshot = {
  enquiries: EnquiryRecord[];
  quotations: QuotationRecord[];
  projects: ProjectRecord[];
  documents: DocumentRecord[];
  revisionRequests: CustomerRevisionRequest[];
};

function owns(context: CustomerAccountContext, record: { accountId?: string; customerId?: string }) {
  return record.accountId === context.account.id || Boolean(context.customer && record.customerId === context.customer.id);
}

export function customerEnquiryStatus(status: EnquiryRecord["status"]) {
  const labels: Partial<Record<EnquiryRecord["status"], string>> = {
    new: "Received", contacted: "Under Review", qualified: "Under Review", requirement_received: "Received", quotation_required: "Under Review", quoted: "Quotation Prepared", quotation_sent: "Quotation Created", converted: "Quotation Created", won: "Closed", lost: "Closed", not_relevant: "Closed", closed: "Closed",
  };
  return labels[status] || "Under Review";
}
export function customerQuoteStatus(status: QuotationRecord["status"]) {
  return quotationStatusLabel(status);
}

export async function customerPortalSnapshot(context: CustomerAccountContext): Promise<CustomerPortalSnapshot> {
  const [allEnquiries, allQuotes, allProjects, documents] = await Promise.all([listAdminEnquiries(), listAdminQuotations(), listAdminProjects(), listAdminDocuments()]);
  const enquiries = allEnquiries.filter((item) => owns(context, item));
  const quotations = allQuotes.filter((item) => owns(context, item));
  const projects = allProjects.filter((item) => context.customer && item.customerId === context.customer.id);
  const visibleDocuments = documents.filter((item) => item.status === "current" && (item.visibility === "public" || item.visibility === "customer"));
  const revisionRequests = await listCustomerRevisionRequests(context);
  return { enquiries, quotations, projects, documents: visibleDocuments, revisionRequests };
}

export async function getCustomerEnquiry(context: CustomerAccountContext, id: string) {
  const detail = await getAdminEnquiry(id);
  return detail && owns(context, detail.enquiry) ? detail.enquiry : null;
}
export async function getCustomerQuotation(context: CustomerAccountContext, id: string) {
  const detail = await getAdminQuotation(id);
  return detail && owns(context, detail.quotation) ? detail.quotation : null;
}
export async function getCustomerProject(context: CustomerAccountContext, id: string) {
  if (!context.customer) return null;
  const detail = await getAdminProject(id);
  return detail && detail.project.customerId === context.customer.id ? detail : null;
}

export async function createCustomerProject(context: CustomerAccountContext, input: { title: string; location?: string; application?: string; deliveryLocation?: string; expectedRequirementDate?: string; notes?: string }) {
  if (!context.customer) throw new Error("Your customer profile is not ready.");
  return createAdminProject({ title: input.title.trim(), customerId: context.customer.id, clientName: context.customer.company || context.account.companyName || context.account.fullName, location: input.location?.trim() || "", requirement: input.application?.trim() || "", solution: input.deliveryLocation?.trim() || "", scope: input.notes?.trim() || "", internalNotes: "Created by authorized customer.", projectStatus: "active", startDate: "", expectedDeliveryDate: input.expectedRequirementDate || "" });
}

export async function listCustomerRevisionRequests(context: CustomerAccountContext): Promise<CustomerRevisionRequest[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return revisionStore().requests.filter((request) => request.accountId === context.account.id);
  if (mode === "unconfigured") return [];
  const client = getSupabaseServiceClient(); if (!client) return [];
  const { data, error } = await client.from("customer_revision_requests").select("*").eq("account_id", context.account.id).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load revision requests.");
  return (data || []).map((item) => ({ id: String(item.id), quotationId: String(item.quotation_id), accountId: String(item.account_id), customerId: String(item.customer_id), reason: String(item.reason), requiredChange: item.required_change ? String(item.required_change) : undefined, quantityChange: item.quantity_change ? String(item.quantity_change) : undefined, productChange: item.product_change ? String(item.product_change) : undefined, deliveryChange: item.delivery_change ? String(item.delivery_change) : undefined, additionalNotes: item.additional_notes ? String(item.additional_notes) : undefined, status: String(item.status || "open") as CustomerRevisionRequest["status"], createdAt: String(item.created_at) }));
}

export async function createCustomerRevisionRequest(context: CustomerAccountContext, quotationId: string, input: Omit<CustomerRevisionRequest, "id" | "quotationId" | "accountId" | "customerId" | "status" | "createdAt">) {
  if (!context.customer) throw new Error("Your customer profile is not ready.");
  const quotation = await getCustomerQuotation(context, quotationId);
  if (!quotation) throw new Error("Quotation not found or you do not have access to it.");
  const request: CustomerRevisionRequest = { id: randomUUID(), quotationId, accountId: context.account.id, customerId: context.customer.id, reason: input.reason.trim(), requiredChange: input.requiredChange?.trim() || undefined, quantityChange: input.quantityChange?.trim() || undefined, productChange: input.productChange?.trim() || undefined, deliveryChange: input.deliveryChange?.trim() || undefined, additionalNotes: input.additionalNotes?.trim() || undefined, status: "open", createdAt: new Date().toISOString() };
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") revisionStore().requests.unshift(request);
  else if (mode !== "unconfigured") {
    const client = getSupabaseServiceClient(); if (!client) throw new Error("Service unavailable.");
    const { error } = await client.from("customer_revision_requests").insert({ quotation_id: quotationId, account_id: request.accountId, customer_id: request.customerId, reason: request.reason, required_change: request.requiredChange || null, quantity_change: request.quantityChange || null, product_change: request.productChange || null, delivery_change: request.deliveryChange || null, additional_notes: request.additionalNotes || null });
    if (error) throw new Error("Could not submit the revision request.");
  }
  await updateAdminQuotation(quotationId, { status: "revision_requested" });
  return request;
}
