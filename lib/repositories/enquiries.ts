import "server-only";

import { randomUUID } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { EnquiryNote, EnquiryRecord, EnquiryStatus, RfqInput } from "@/lib/db/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type DevelopmentStore = { enquiries: EnquiryRecord[]; enquiryNotes: EnquiryNote[] };

function developmentStore(): DevelopmentStore {
  const store = persistentDevelopmentStore("enquiries", () => ({ enquiries: [], enquiryNotes: [] }));
  if (!store.enquiryNotes) store.enquiryNotes = [];
  return store;
}

export type AttachmentInput = { name: string; type: string; size: number; buffer?: Buffer };
export type SaveEnquiryResult = { enquiry: EnquiryRecord; mode: IntegrationMode; created: boolean };
export type EnquiryIdentityLinks = { accountId?: string; customerId?: string };
export type AdminEnquiryPatch = { status?: EnquiryStatus; followUpAt?: string; followUpNote?: string; internalNotes?: string; lostReason?: string; customerId?: string; projectId?: string; accountId?: string };

function developmentEnquiryNumber() {
  const prefix = `ENQ-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
  const number = developmentStore().enquiries.filter((item) => String(item.enquiryNumber || "").startsWith(prefix)).length + 1;
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

async function saveAttachment(file: AttachmentInput): Promise<{ name: string; url?: string; size: number; type: string }> {
  const client = getSupabaseServiceClient();
  if (!client || !file.buffer) return { name: file.name, size: file.size, type: file.type };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `rfq/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName}`;
  const { error } = await client.storage.from("rfq-attachments").upload(path, file.buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error("Could not store the attached RFQ file.");
  // The bucket is private. Store the object path; admin readers must request a
  // short-lived signed URL instead of exposing a permanent public attachment URL.
  return { name: file.name, url: path, size: file.size, type: file.type };
}

export async function createEnquiry(
  input: RfqInput,
  file?: AttachmentInput,
  links: EnquiryIdentityLinks = {},
): Promise<SaveEnquiryResult> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const attachment = file ? await saveAttachment(file) : undefined;
  const enquiry: EnquiryRecord = {
    ...input,
    id: randomUUID(),
    enquiryNumber: developmentEnquiryNumber(),
    source: "website",
    status: "new",
    createdAt: new Date().toISOString(),
    ...(links.accountId ? { accountId: links.accountId } : {}),
    ...(links.customerId ? { customerId: links.customerId } : {}),
    ...(attachment ? { attachment } : {}),
  };

  if (mode === "mock") {
    if (input.submissionId) {
      const existing = developmentStore().enquiries.find((item) => item.submissionId === input.submissionId);
      if (existing) return { enquiry: existing, mode, created: false };
    }
    developmentStore().enquiries.unshift(enquiry);
    return { enquiry, mode, created: true };
  }
  if (mode === "unconfigured") throw new Error("Lead storage is not configured.");

  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  if (input.submissionId) {
    const { data: existing, error: existingError } = await client
      .from("enquiries")
      .select("id, enquiry_number, created_at")
      .eq("public_submission_id", input.submissionId)
      .maybeSingle();
    if (existingError) throw new Error("Could not check a previous quote request.");
    if (existing) {
      enquiry.id = String(existing.id);
      enquiry.enquiryNumber = String(existing.enquiry_number || enquiry.enquiryNumber);
      enquiry.createdAt = String(existing.created_at || enquiry.createdAt);
      return { enquiry, mode, created: false };
    }
  }
  const { data: saved, error } = await client.from("enquiries").insert({
    id: enquiry.id,
    name: enquiry.name,
    company: enquiry.company || null,
    mobile: enquiry.mobile,
    email: enquiry.email || null,
    city: enquiry.city || null,
    state: enquiry.state || null,
    pin_code: enquiry.pinCode || null,
    project_location: enquiry.projectLocation || null,
    project_name: enquiry.projectName || null,
    product_name: enquiry.product || null,
    brand_name: enquiry.brand || null,
    quantity: enquiry.quantity || null,
    thickness: enquiry.thickness || null,
    application_name: enquiry.application || null,
    customer_type: enquiry.customerType || null,
    delivery_preference: enquiry.deliveryPreference || null,
    message: enquiry.message || null,
    account_id: links.accountId || null,
    customer_id: links.customerId || null,
    public_submission_id: input.submissionId || null,
    source: "website",
    status: "new",
  }).select("enquiry_number, created_at").single();
  if (error || !saved) throw new Error("Could not save your quote request.");
  enquiry.enquiryNumber = String(saved.enquiry_number || enquiry.enquiryNumber);
  enquiry.createdAt = String(saved.created_at || enquiry.createdAt);

  if (attachment) {
    const { error: attachmentError } = await client.from("enquiry_attachments").insert({
      enquiry_id: enquiry.id,
      file_name: attachment.name,
      file_url: attachment.url || null,
      mime_type: attachment.type || null,
      size_bytes: attachment.size,
    });
    if (attachmentError) throw new Error("Your request was saved, but the attachment could not be linked.");
  }
  return { enquiry, mode, created: true };
}

/** Safe local inspection point for development and integration tests only. */
export function listDevelopmentEnquiries(): EnquiryRecord[] {
  return developmentStore().enquiries;
}

function toEnquiryRecord(row: Record<string, unknown>): EnquiryRecord {
  return {
    id: String(row.id), enquiryNumber: String(row.enquiry_number || row.id), name: String(row.name || ""), company: String(row.company || ""), mobile: String(row.mobile || ""), email: String(row.email || ""), city: String(row.city || ""), state: String(row.state || ""), pinCode: String(row.pin_code || ""), projectLocation: String(row.project_location || ""), projectName: String(row.project_name || ""), product: String(row.product_name || ""), brand: String(row.brand_name || ""), quantity: String(row.quantity || ""), thickness: String(row.thickness || ""), application: String(row.application_name || ""), customerType: row.customer_type as RfqInput["customerType"], deliveryPreference: String(row.delivery_preference || ""), message: String(row.message || ""), source: "website", status: row.status as EnquiryStatus, createdAt: String(row.created_at), customerId: row.customer_id ? String(row.customer_id) : undefined, accountId: row.account_id ? String(row.account_id) : undefined, projectId: row.project_id ? String(row.project_id) : undefined, followUpAt: row.follow_up_at ? String(row.follow_up_at) : undefined, followUpNote: row.follow_up_note ? String(row.follow_up_note) : undefined, internalNotes: row.internal_notes ? String(row.internal_notes) : undefined, lostReason: row.lost_reason ? String(row.lost_reason) : undefined,
  };
}

export async function listAdminEnquiries(query = ""): Promise<EnquiryRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const normalized = query.trim().toLowerCase();
    return developmentStore().enquiries.filter((item) => !normalized || [item.name, item.company, item.mobile, item.email, item.product, item.application, item.city].join(" ").toLowerCase().includes(normalized));
  }
  if (mode === "unconfigured") throw new Error("Enquiry storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("enquiries").select("*").order("created_at", { ascending: false }).limit(100);
  if (query.trim()) request = request.or(`name.ilike.%${query.trim()}%,company.ilike.%${query.trim()}%,mobile.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,product_name.ilike.%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw new Error("Could not load enquiries.");
  return (data || []).map((row) => toEnquiryRecord(row as Record<string, unknown>));
}

/** Returns the complete enquiry history for one approved customer. */
export async function listAdminEnquiriesForCustomer(customerId: string): Promise<EnquiryRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().enquiries.filter((item) => item.customerId === customerId);
  if (mode === "unconfigured") throw new Error("Enquiry storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("enquiries").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Could not load the customer's enquiries.");
  return (data || []).map((row) => toEnquiryRecord(row as Record<string, unknown>));
}

export async function getAdminEnquiry(id: string): Promise<{ enquiry: EnquiryRecord; notes: EnquiryNote[] } | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const enquiry = developmentStore().enquiries.find((item) => item.id === id);
    return enquiry ? { enquiry, notes: developmentStore().enquiryNotes.filter((note) => note.enquiryId === id) } : null;
  }
  if (mode === "unconfigured") throw new Error("Enquiry storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data, error }, { data: notes, error: noteError }] = await Promise.all([client.from("enquiries").select("*").eq("id", id).maybeSingle(), client.from("enquiry_notes").select("id, enquiry_id, note, created_at").eq("enquiry_id", id).order("created_at", { ascending: false })]);
  if (error || noteError) throw new Error("Could not load the enquiry.");
  if (!data) return null;
  return { enquiry: toEnquiryRecord(data as Record<string, unknown>), notes: (notes || []).map((note) => ({ id: note.id, enquiryId: note.enquiry_id, note: note.note, createdAt: note.created_at })) };
}

export async function updateAdminEnquiry(id: string, patch: AdminEnquiryPatch): Promise<EnquiryRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().enquiries.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const existing = developmentStore().enquiries[index];
    const enquiry = { ...existing, ...patch, followUpAt: patch.followUpAt || undefined, followUpNote: patch.followUpNote || undefined, internalNotes: patch.internalNotes || undefined, lostReason: patch.lostReason || undefined };
    developmentStore().enquiries[index] = enquiry;
    return enquiry;
  }
  if (mode === "unconfigured") throw new Error("Enquiry storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { ...(patch.status ? { status: patch.status } : {}), ...(patch.followUpAt !== undefined ? { follow_up_at: patch.followUpAt || null } : {}), ...(patch.followUpNote !== undefined ? { follow_up_note: patch.followUpNote || null } : {}), ...(patch.internalNotes !== undefined ? { internal_notes: patch.internalNotes || null } : {}), ...(patch.lostReason !== undefined ? { lost_reason: patch.lostReason || null } : {}), ...(patch.customerId !== undefined ? { customer_id: patch.customerId || null } : {}), ...(patch.accountId !== undefined ? { account_id: patch.accountId || null } : {}), ...(patch.projectId !== undefined ? { project_id: patch.projectId || null } : {}), last_activity_at: new Date().toISOString() };
  const { data, error } = await client.from("enquiries").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not update the enquiry.");
  return data ? toEnquiryRecord(data as Record<string, unknown>) : null;
}

/** Links a captured enquiry to the customer and project created for its quotation. */
export async function linkEnquiryToSales(id: string, customerId: string, projectId?: string): Promise<EnquiryRecord | null> {
  return updateAdminEnquiry(id, { customerId, projectId: projectId || "", status: "quotation_sent" });
}

/** Links a public enquiry to a registered account before that account is approved. */
export async function linkEnquiryToAccount(id: string, accountId: string): Promise<EnquiryRecord | null> {
  return updateAdminEnquiry(id, { accountId, status: "quotation_required" });
}

export async function addAdminEnquiryNote(enquiryId: string, note: string, adminId?: string): Promise<EnquiryNote> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const entry: EnquiryNote = { id: randomUUID(), enquiryId, note, createdAt: new Date().toISOString() };
  if (mode === "mock") { developmentStore().enquiryNotes.unshift(entry); return entry; }
  if (mode === "unconfigured") throw new Error("Enquiry storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("enquiry_notes").insert({ enquiry_id: enquiryId, note, created_by: adminId || null }).select("id, enquiry_id, note, created_at").single();
  if (error || !data) throw new Error("Could not add the enquiry note.");
  return { id: data.id, enquiryId: data.enquiry_id, note: data.note, createdAt: data.created_at };
}
