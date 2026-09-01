import "server-only";

import { randomUUID } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { CustomerNote, CustomerRecord, CustomerStatus, CustomerType, EnquiryRecord, ProjectRecord, QuotationCustomer, QuotationRecord } from "@/lib/db/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";
import { listAdminEnquiriesForCustomer } from "@/lib/repositories/enquiries";
import { listAdminProjectsForCustomer } from "@/lib/repositories/projects";
import { listAdminQuotationsForCustomer } from "@/lib/repositories/quotations";

type DevelopmentStore = { customers: CustomerRecord[]; customerNotes: CustomerNote[] };

function developmentStore(): DevelopmentStore {
  const store = persistentDevelopmentStore("customers", () => ({ customers: [], customerNotes: [] }));
  if (!store.customerNotes) store.customerNotes = [];
  return store;
}

export type CustomerInput = Omit<CustomerRecord, "id" | "createdAt">;
export type CustomerDetail = {
  customer: CustomerRecord;
  notes: CustomerNote[];
  linked: {
    enquiries: EnquiryRecord[];
    quotations: QuotationRecord[];
    projects: ProjectRecord[];
  };
};
export type SaveCustomerResult = { customer: CustomerRecord; mode: IntegrationMode };

export class CustomerConflictError extends Error {}

function normalise(value?: string) { return value?.trim().toLowerCase() || ""; }
function toCustomerRecord(row: Record<string, unknown>): CustomerRecord {
  return {
    id: String(row.id), accountId: row.account_id ? String(row.account_id) : undefined, fullName: String(row.full_name || ""), company: row.company ? String(row.company) : undefined, phone: row.phone ? String(row.phone) : undefined, email: row.email ? String(row.email) : undefined, gstin: row.gstin ? String(row.gstin) : undefined, billingAddress: row.billing_address ? String(row.billing_address) : undefined, shippingAddress: row.shipping_address ? String(row.shipping_address) : undefined, city: row.city ? String(row.city) : undefined, state: row.state ? String(row.state) : undefined, pinCode: row.pin_code ? String(row.pin_code) : undefined, customerType: row.customer_type as CustomerType, notes: row.notes ? String(row.notes) : undefined, status: row.status as CustomerStatus, createdAt: String(row.created_at),
  };
}

function matchesDuplicate(record: CustomerRecord, input: CustomerInput) {
  const email = normalise(input.email); const phone = normalise(input.phone); const gstin = normalise(input.gstin);
  return Boolean((email && normalise(record.email) === email) || (phone && normalise(record.phone) === phone) || (gstin && normalise(record.gstin) === gstin));
}

function customerTypeFromQuotation(type?: QuotationCustomer["customerType"]): CustomerType {
  if (type === "contractor") return "hvac_contractor";
  if (type === "consultant" || type === "dealer" || type === "end_user") return type;
  return "other";
}

function quotationCustomerInput(customer: QuotationCustomer): CustomerInput {
  return {
    fullName: customer.fullName,
    company: customer.company,
    phone: customer.mobile,
    email: customer.email,
    gstin: customer.gstin || "",
    billingAddress: customer.billingAddress || "",
    shippingAddress: customer.shippingAddress || "",
    city: customer.city || "",
    state: customer.state || "",
    pinCode: customer.pinCode || "",
    customerType: customerTypeFromQuotation(customer.customerType),
    notes: customer.notes || "",
    status: "active",
  };
}

/** Finds a customer by commercial identity or creates the single master record for a quote. */
export async function findOrCreateCustomerForQuotation(customer: QuotationCustomer): Promise<SaveCustomerResult> {
  const input = quotationCustomerInput(customer);
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");

  if (mode === "mock") {
    const existing = developmentStore().customers.find((record) => matchesDuplicate(record, input));
    if (existing) return { customer: existing, mode };
    const record: CustomerRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    developmentStore().customers.unshift(record);
    return { customer: record, mode };
  }

  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const lookups = [
    input.phone ? client.from("customers").select("*").eq("phone", input.phone).limit(1) : null,
    input.email ? client.from("customers").select("*").ilike("email", input.email).limit(1) : null,
    input.gstin ? client.from("customers").select("*").ilike("gstin", input.gstin).limit(1) : null,
  ];
  for (const lookup of lookups) {
    if (!lookup) continue;
    const { data, error } = await lookup;
    if (error) throw new Error("Could not check for a matching customer.");
    if (data?.[0]) return { customer: toCustomerRecord(data[0] as Record<string, unknown>), mode };
  }

  return createAdminCustomer(input);
}

export async function listAdminCustomers(query = ""): Promise<CustomerRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const search = query.trim().toLowerCase();
    return developmentStore().customers.filter((item) => Boolean(item.accountId) && (!search || [item.fullName, item.company, item.phone, item.email, item.gstin, item.city].join(" ").toLowerCase().includes(search)));
  }
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("customers").select("*").not("account_id", "is", null).order("created_at", { ascending: false }).limit(100);
  if (query.trim()) request = request.or(`full_name.ilike.%${query.trim()}%,company.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,gstin.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw new Error("Could not load customers.");
  return (data || []).map((row) => toCustomerRecord(row as Record<string, unknown>));
}

export async function createAdminCustomer(input: CustomerInput): Promise<SaveCustomerResult> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");
  if (mode === "mock") {
    if (developmentStore().customers.some((record) => matchesDuplicate(record, input))) throw new CustomerConflictError("A customer already uses this email, phone number or GSTIN.");
    const customer: CustomerRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    developmentStore().customers.unshift(customer);
    return { customer, mode };
  }

  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const email = normalise(input.email); const phone = input.phone?.trim() || ""; const gstin = input.gstin?.trim() || "";
  const conditions = [email ? `email.ilike.${email}` : "", phone ? `phone.eq.${phone}` : "", gstin ? `gstin.ilike.${gstin}` : ""].filter(Boolean).join(",");
  if (conditions) {
    const { data: duplicates, error: duplicateError } = await client.from("customers").select("id").or(conditions).limit(1);
    if (duplicateError) throw new Error("Could not check for matching customers.");
    if (duplicates?.length) throw new CustomerConflictError("A customer already uses this email, phone number or GSTIN.");
  }
    const { data, error } = await client.from("customers").insert({ account_id: input.accountId || null, full_name: input.fullName, company: input.company || null, phone: input.phone || null, email: input.email || null, gstin: input.gstin || null, billing_address: input.billingAddress || null, shipping_address: input.shippingAddress || null, city: input.city || null, state: input.state || null, pin_code: input.pinCode || null, customer_type: input.customerType, notes: input.notes || null, status: input.status }).select("*").single();
  if (error || !data) throw new Error("Could not create the customer.");
  return { customer: toCustomerRecord(data as Record<string, unknown>), mode };
}

export async function getAdminCustomer(id: string): Promise<CustomerDetail | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const customer = developmentStore().customers.find((item) => item.id === id);
    if (!customer) return null;
    const [enquiries, quotations, projects] = await Promise.all([
      listAdminEnquiriesForCustomer(id),
      listAdminQuotationsForCustomer(id),
      listAdminProjectsForCustomer(id),
    ]);
    return { customer, notes: developmentStore().customerNotes.filter((note) => note.customerId === id), linked: { enquiries, quotations, projects } };
  }
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data, error }, { data: notes, error: noteError }, enquiries, quotations, projects] = await Promise.all([
    client.from("customers").select("*").eq("id", id).maybeSingle(),
    client.from("customer_notes").select("id, customer_id, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    listAdminEnquiriesForCustomer(id),
    listAdminQuotationsForCustomer(id),
    listAdminProjectsForCustomer(id),
  ]);
  if (error || noteError) throw new Error("Could not load the customer.");
  if (!data) return null;
  return { customer: toCustomerRecord(data as Record<string, unknown>), notes: (notes || []).map((note) => ({ id: note.id, customerId: note.customer_id, note: note.note, createdAt: note.created_at })), linked: { enquiries, quotations, projects } };
}

export async function updateAdminCustomer(id: string, patch: Partial<CustomerInput>): Promise<CustomerRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().customers.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const customer = { ...developmentStore().customers[index], ...patch };
    developmentStore().customers[index] = customer;
    return customer;
  }
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { ...(patch.accountId !== undefined ? { account_id: patch.accountId || null } : {}), ...(patch.fullName !== undefined ? { full_name: patch.fullName } : {}), ...(patch.company !== undefined ? { company: patch.company || null } : {}), ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}), ...(patch.email !== undefined ? { email: patch.email || null } : {}), ...(patch.gstin !== undefined ? { gstin: patch.gstin || null } : {}), ...(patch.billingAddress !== undefined ? { billing_address: patch.billingAddress || null } : {}), ...(patch.shippingAddress !== undefined ? { shipping_address: patch.shippingAddress || null } : {}), ...(patch.city !== undefined ? { city: patch.city || null } : {}), ...(patch.state !== undefined ? { state: patch.state || null } : {}), ...(patch.pinCode !== undefined ? { pin_code: patch.pinCode || null } : {}), ...(patch.customerType !== undefined ? { customer_type: patch.customerType } : {}), ...(patch.notes !== undefined ? { notes: patch.notes || null } : {}), ...(patch.status !== undefined ? { status: patch.status } : {}) };
  const { data, error } = await client.from("customers").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not update the customer.");
  return data ? toCustomerRecord(data as Record<string, unknown>) : null;
}

export async function addAdminCustomerNote(customerId: string, note: string, adminId?: string): Promise<CustomerNote> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const entry: CustomerNote = { id: randomUUID(), customerId, note, createdAt: new Date().toISOString() };
  if (mode === "mock") { developmentStore().customerNotes.unshift(entry); return entry; }
  if (mode === "unconfigured") throw new Error("Customer storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("customer_notes").insert({ customer_id: customerId, note, created_by: adminId || null }).select("id, customer_id, note, created_at").single();
  if (error || !data) throw new Error("Could not add the customer note.");
  return { id: data.id, customerId: data.customer_id, note: data.note, createdAt: data.created_at };
}
