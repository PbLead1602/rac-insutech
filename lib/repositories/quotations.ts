import "server-only";

import { randomUUID } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { CustomBuiltUpNbrSnapshot, QuotationCustomer, QuotationLineRecord, QuotationNote, QuotationRecord, QuotationSource, QuotationStatus } from "@/lib/db/types";
import { getServerPricedVariant } from "@/lib/quotations/pricing";
import { nextQuotationStatusForPatch, quotationShouldExpire } from "@/lib/quotations/status";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type DevelopmentStore = { quotations: QuotationRecord[]; quotationNotes: QuotationNote[] };

function developmentStore(): DevelopmentStore {
  const store = persistentDevelopmentStore("quotations", () => ({ quotations: [], quotationNotes: [] }));
  if (!store.quotationNotes) store.quotationNotes = [];
  return store;
}

export type CreateQuotationInput = {
  customer: QuotationCustomer;
  items: QuotationLineRecord[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  source?: QuotationSource;
  status?: QuotationStatus;
  validUntil?: string;
  internalNotes?: string;
  customerId?: string;
  accountId?: string;
  projectId?: string;
  enquiryId?: string;
};

export type CreateAdminQuotationInput = {
  customer: QuotationCustomer;
  items: Array<Omit<QuotationLineRecord, "amount" | "provisional">>;
  gstRate: number;
  validUntil?: string;
  internalNotes?: string;
  customerId?: string;
  accountId?: string;
  projectId?: string;
  enquiryId?: string;
};

export type AdminQuotationPatch = {
  status?: QuotationStatus;
  followUpAt?: string;
  followUpNote?: string;
  internalNotes?: string;
  lostReason?: string;
  validUntil?: string;
};

export type CreateQuotationRevisionInput = {
  customer: QuotationCustomer;
  items: Array<Omit<QuotationLineRecord, "amount" | "provisional">>;
  gstRate: number;
  validUntil?: string;
  internalNotes?: string;
  reason: string;
};

export type SaveQuotationResult = { quotation: QuotationRecord; mode: IntegrationMode };

function quotePrefix(date = new Date()) {
  return `RAC-Q-${date.toISOString().slice(0, 10).replaceAll("-", "")}`;
}

function developmentQuoteNumber() {
  const prefix = quotePrefix();
  const number = developmentStore().quotations.filter((quote) => quote.quoteNumber.startsWith(prefix)).length + 1;
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

async function liveQuoteNumber() {
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.rpc("next_rac_quote_number");
  if (!error && data) return String(data);

  // A production database can be created before the optional RPC helper is
  // applied. Do not make commercial quotation issuance depend on that single
  // helper: the trusted service client can safely calculate the next daily
  // reference from the existing quotation records as a compatibility path.
  // The normal RPC remains preferred because it has a database advisory lock.
  console.warn("next_rac_quote_number RPC is unavailable; using compatibility allocation", {
    code: error?.code,
    message: error?.message,
  });
  const prefix = quotePrefix();
  const { data: existing, error: lookupError } = await client
    .from("quotations")
    .select("quote_number")
    .like("quote_number", `${prefix}-%`)
    .limit(1000);
  if (lookupError) throw new Error("Quotation numbering is temporarily unavailable. Please try again shortly.");
  const nextNumber = (existing || []).reduce((highest, row) => {
    const match = /-(\d+)$/.exec(String(row.quote_number || ""));
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

function isQuoteNumberConflict(error: { code?: string | null; message?: string | null } | null) {
  return error?.code === "23505" && /quote_number/i.test(error.message || "");
}

function validityDate(createdAt: string, days: number) {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isCustomBuiltUpSnapshot(value: unknown): value is CustomBuiltUpNbrSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.itemType === "CUSTOM_BUILT_UP_NBR" && Array.isArray(snapshot.layers) && typeof snapshot.baseDiameterMm === "number";
}

function quotationFromRow(quotation: Record<string, unknown>, items: Record<string, unknown>[] = []): QuotationRecord {
  return {
    id: String(quotation.id),
    quoteNumber: String(quotation.quote_number || ""),
    accessToken: String(quotation.access_token || ""),
    customer: quotation.customer as QuotationCustomer,
    items: items.map((item) => {
      const snapshot = item.snapshot;
      const customBuiltUp = isCustomBuiltUpSnapshot(snapshot) ? snapshot : undefined;
      return {
        variantId: String(item.variant_id || item.product_variant_uuid || ""),
        productName: String(item.product_name || ""),
        configuration: String(item.configuration || ""),
        requestedQuantity: Number(item.requested_quantity || 0),
        requestedUnit: String(item.requested_unit || ""),
        suppliedQuantity: Number(item.supplied_quantity || 0),
        suppliedUnit: String(item.supplied_unit || ""),
        cartons: item.cartons ? Number(item.cartons) : undefined,
        technicalQuantity: String(item.technical_quantity || ""),
        rate: Number(item.quoted_rate || item.rate || 0),
        rateUnit: String(item.rate_unit || ""),
        amount: Number(item.amount || 0),
        provisional: true as const,
        ...(customBuiltUp ? { itemType: "CUSTOM_BUILT_UP_NBR" as const, customBuiltUp } : {}),
      };
    }),
    subtotal: Number(quotation.subtotal || 0),
    gstRate: Number(quotation.gst_rate || 0),
    gstAmount: Number(quotation.gst_amount || 0),
    total: Number(quotation.total || 0),
    transport: "At Actual",
    paymentTerms: String(quotation.payment_terms || "100% Advance along with Order."),
    validityDays: Number(quotation.validity_days || 7),
    status: quotation.status as QuotationStatus,
    isProvisional: true,
    createdAt: String(quotation.created_at),
    source: quotation.source as QuotationSource | undefined,
    customerId: quotation.customer_id ? String(quotation.customer_id) : undefined,
    accountId: quotation.account_id ? String(quotation.account_id) : undefined,
    projectId: quotation.project_id ? String(quotation.project_id) : undefined,
    enquiryId: quotation.enquiry_id ? String(quotation.enquiry_id) : undefined,
    revisionNumber: quotation.revision_number === undefined ? undefined : Number(quotation.revision_number),
    parentQuotationId: quotation.parent_quotation_id ? String(quotation.parent_quotation_id) : undefined,
    validUntil: quotation.valid_until ? String(quotation.valid_until) : undefined,
    followUpAt: quotation.follow_up_at ? String(quotation.follow_up_at) : undefined,
    followUpNote: quotation.follow_up_note ? String(quotation.follow_up_note) : undefined,
    internalNotes: quotation.internal_notes ? String(quotation.internal_notes) : undefined,
    lostReason: quotation.lost_reason ? String(quotation.lost_reason) : undefined,
    lastSentAt: quotation.last_sent_at ? String(quotation.last_sent_at) : undefined,
    lastViewedAt: quotation.last_viewed_at ? String(quotation.last_viewed_at) : undefined,
  };
}

function quotationItemRow(quotationId: string, item: QuotationLineRecord, sortOrder: number) {
  return {
    quotation_id: quotationId,
    variant_id: item.variantId,
    product_name: item.productName,
    configuration: item.configuration,
    requested_quantity: item.requestedQuantity,
    requested_unit: item.requestedUnit,
    supplied_quantity: item.suppliedQuantity,
    supplied_unit: item.suppliedUnit,
    cartons: item.cartons || null,
    technical_quantity: item.technicalQuantity,
    rate: item.rate,
    quoted_rate: item.rate,
    rate_unit: item.rateUnit,
    amount: item.amount,
    sort_order: sortOrder,
    item_type: item.itemType || "STANDARD",
    snapshot: item.customBuiltUp || {},
  };
}

async function persistQuotationItems(client: NonNullable<ReturnType<typeof getSupabaseServiceClient>>, quotationId: string, items: QuotationLineRecord[]) {
  const { data: insertedItems, error: itemError } = await client
    .from("quotation_items")
    .insert(items.map((item, index) => quotationItemRow(quotationId, item, index)))
    .select("id, sort_order");
  if (itemError || !insertedItems) throw new Error("The quotation was saved, but its line items could not be stored.");

  const layerRows = insertedItems.flatMap((item) => {
    const line = items[Number(item.sort_order)];
    const custom = line?.customBuiltUp;
    if (!custom) return [];
    return custom.layers.map((layer) => ({
      quotation_item_id: item.id,
      layer_number: layer.layerNumber,
      sheet_variant_id: layer.variantId,
      sheet_product_name: layer.sheetProductName,
      material_class: layer.materialClass,
      thickness_mm: layer.thicknessMm,
      lamination: layer.lamination,
      inner_diameter_mm: layer.innerDiameterMm,
      mean_diameter_mm: layer.meanDiameterMm,
      outer_diameter_mm: layer.outerDiameterMm,
      circumference_m: layer.circumferenceM,
      net_area_m2: layer.netAreaM2,
      wastage_percent: custom.wastagePercent,
      quoted_area_m2: layer.quotedAreaM2,
      unit_rate_snapshot: layer.rate,
      amount_snapshot: layer.amount,
    }));
  });
  if (!layerRows.length) return;
  const { error: layerError } = await client.from("quotation_item_layers").insert(layerRows);
  if (layerError) throw new Error("The quotation was saved, but its custom NBR layer snapshot could not be stored.");
}

export async function createQuotation(input: CreateQuotationInput): Promise<SaveQuotationResult> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");

  const quoteNumber = mode === "mock" ? developmentQuoteNumber() : await liveQuoteNumber();
  const createdAt = new Date().toISOString();
  const quotation: QuotationRecord = {
    id: randomUUID(),
    quoteNumber,
    accessToken: randomUUID().replaceAll("-", ""),
    customer: input.customer,
    items: input.items,
    subtotal: input.subtotal,
    gstRate: input.gstRate,
    gstAmount: input.gstAmount,
    total: input.total,
    transport: "At Actual",
    paymentTerms: "100% Advance along with Order.",
    validityDays: 7,
    validUntil: input.validUntil || validityDate(createdAt, 7),
    source: input.source || "website_auto_quote",
    customerId: input.customerId,
    accountId: input.accountId,
    projectId: input.projectId,
    enquiryId: input.enquiryId,
    revisionNumber: 0,
    status: input.status || "generated",
    isProvisional: true,
    createdAt,
    internalNotes: input.internalNotes || undefined,
  };

  if (mode === "mock") {
    developmentStore().quotations.unshift(quotation);
    return { quotation, mode };
  }

  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  // The compatibility allocator reads the latest daily number. A rare
  // simultaneous request can select the same number, so retry the insert with
  // a newly allocated reference if the unique quote-number rule catches it.
  let quotationInsertError: { code?: string | null; message?: string | null } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await client.from("quotations").insert({
      id: quotation.id,
      quote_number: quotation.quoteNumber,
      access_token: quotation.accessToken,
      customer: quotation.customer,
      subtotal: quotation.subtotal,
      gst_rate: quotation.gstRate,
      gst_amount: quotation.gstAmount,
      total: quotation.total,
      transport: quotation.transport,
      payment_terms: quotation.paymentTerms,
      validity_days: quotation.validityDays,
      valid_until: quotation.validUntil,
      source: quotation.source,
      customer_id: quotation.customerId || null,
      account_id: quotation.accountId || null,
      project_id: quotation.projectId || null,
      enquiry_id: quotation.enquiryId || null,
      revision_number: quotation.revisionNumber,
      status: quotation.status,
      is_provisional: quotation.isProvisional,
      internal_notes: quotation.internalNotes || null,
    });
    if (!error) {
      quotationInsertError = null;
      break;
    }
    quotationInsertError = error;
    if (!isQuoteNumberConflict(error) || attempt === 2) break;
    quotation.quoteNumber = await liveQuoteNumber();
  }
  if (quotationInsertError) throw new Error("Could not save the quotation.");

  await persistQuotationItems(client, quotation.id, quotation.items);
  return { quotation, mode };
}

/** Creates an editable Admin draft while keeping issued and website quotations immutable. */
export async function createAdminQuotation(input: CreateAdminQuotationInput): Promise<SaveQuotationResult> {
  const items: QuotationLineRecord[] = input.items.map((item) => ({
    ...item,
    amount: item.customBuiltUp?.quotedOverrideAmount ?? item.customBuiltUp?.calculatedBasicAmount ?? Number((item.suppliedQuantity * item.rate).toFixed(2)),
    provisional: true,
  }));
  const subtotal = Number(items.reduce((total, item) => total + item.amount, 0).toFixed(2));
  const gstAmount = Number((subtotal * (input.gstRate / 100)).toFixed(2));
  return createQuotation({
    customer: input.customer,
    items,
    subtotal,
    gstRate: input.gstRate,
    gstAmount,
    total: Number((subtotal + gstAmount).toFixed(2)),
    source: input.enquiryId ? "enquiry_converted" : "admin_created",
    // The Admin action has created an actual quotation. It becomes "sent"
    // only after the customer email provider confirms delivery.
    status: "generated",
    validUntil: input.validUntil,
    internalNotes: input.internalNotes,
    customerId: input.customerId,
    accountId: input.accountId,
    projectId: input.projectId,
    enquiryId: input.enquiryId,
  });
}

export async function getQuotationByAccessToken(accessToken: string): Promise<QuotationRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().quotations.findIndex((quote) => quote.accessToken === accessToken);
    if (index < 0) return null;
    if (quotationShouldExpire(developmentStore().quotations[index])) developmentStore().quotations[index] = { ...developmentStore().quotations[index], status: "expired" };
    return developmentStore().quotations[index];
  }
  if (mode === "unconfigured") return null;

  const client = getSupabaseServiceClient();
  if (!client) return null;
  const { data: quotation, error } = await client.from("quotations").select("*").eq("access_token", accessToken).maybeSingle();
  if (error || !quotation) return null;
  const { data: items } = await client.from("quotation_items").select("*").eq("quotation_id", quotation.id).order("sort_order");
  const record = quotationFromRow(quotation as Record<string, unknown>, (items || []) as Record<string, unknown>[]);
  if (!quotationShouldExpire(record)) return record;
  const { error: expiryError } = await client.from("quotations").update({ status: "expired" }).eq("id", record.id);
  if (expiryError) throw new Error("Could not update the expired quotation.");
  return { ...record, status: "expired" };
}

export async function listAdminQuotations(query = ""): Promise<QuotationRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const today = new Date().toISOString().slice(0, 10);
    developmentStore().quotations = developmentStore().quotations.map((quotation) => quotationShouldExpire(quotation, today) ? { ...quotation, status: "expired" } : quotation);
    const normalized = query.trim().toLowerCase();
    return developmentStore().quotations.filter((item) => !normalized || [item.quoteNumber, item.customer.fullName, item.customer.company, item.customer.mobile, item.customer.email, item.customer.projectName].join(" ").toLowerCase().includes(normalized));
  }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  // This lazy, server-side transition means a quote is never shown as active
  // after its validity date even when no Admin has opened it that day.
  const today = new Date().toISOString().slice(0, 10);
  const { error: expiryError } = await client
    .from("quotations")
    .update({ status: "expired" })
    .lt("valid_until", today)
    .in("status", ["generated", "sent", "viewed", "follow_up", "revision_requested", "revised"]);
  if (expiryError) throw new Error("Could not update expired quotations.");
  let request = client.from("quotations").select("*").order("created_at", { ascending: false }).limit(100);
  if (query.trim()) request = request.or(`quote_number.ilike.%${query.trim()}%,customer->>fullName.ilike.%${query.trim()}%,customer->>company.ilike.%${query.trim()}%,customer->>mobile.ilike.%${query.trim()}%,customer->>email.ilike.%${query.trim()}%`);
  const { data, error } = await request;
  if (error) throw new Error("Could not load quotations.");
  return (data || []).map((row) => quotationFromRow(row as Record<string, unknown>));
}

/** Returns the full commercial history for a selected customer record. */
export async function listAdminQuotationsForCustomer(customerId: string): Promise<QuotationRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().quotations.filter((item) => item.customerId === customerId);
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("quotations").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Could not load the customer's quotations.");
  return (data || []).map((row) => quotationFromRow(row as Record<string, unknown>));
}

export async function getAdminQuotation(id: string): Promise<{ quotation: QuotationRecord; notes: QuotationNote[] } | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().quotations.findIndex((item) => item.id === id);
    if (index >= 0 && quotationShouldExpire(developmentStore().quotations[index])) developmentStore().quotations[index] = { ...developmentStore().quotations[index], status: "expired" };
    const quotation = index >= 0 ? developmentStore().quotations[index] : undefined;
    return quotation ? { quotation, notes: developmentStore().quotationNotes.filter((note) => note.quotationId === id) } : null;
  }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data: quotation, error }, { data: items, error: itemError }, { data: notes, error: noteError }] = await Promise.all([
    client.from("quotations").select("*").eq("id", id).maybeSingle(),
    client.from("quotation_items").select("*").eq("quotation_id", id).order("sort_order"),
    client.from("quotation_notes").select("id, quotation_id, note, created_at").eq("quotation_id", id).order("created_at", { ascending: false }),
  ]);
  if (error || itemError || noteError) throw new Error("Could not load the quotation.");
  if (!quotation) return null;
  let currentQuotation = quotationFromRow(quotation as Record<string, unknown>, (items || []) as Record<string, unknown>[]);
  if (quotationShouldExpire(currentQuotation)) {
    const { error: expiryError } = await client.from("quotations").update({ status: "expired" }).eq("id", currentQuotation.id);
    if (expiryError) throw new Error("Could not update the expired quotation.");
    currentQuotation = { ...currentQuotation, status: "expired" };
  }
  return {
    quotation: currentQuotation,
    notes: (notes || []).map((note) => ({ id: note.id, quotationId: note.quotation_id, note: note.note, createdAt: note.created_at })),
  };
}

export type CurrentQuotationRate = { variantId: string; rate: number; rateUnit: string; found: boolean };

/** Supplies the currently approved rate-card values when an Admin starts a new quote revision. */
export async function getCurrentQuotationRevisionRates(id: string): Promise<CurrentQuotationRate[] | null> {
  const detail = await getAdminQuotation(id); if (!detail) return null;
  return Promise.all(detail.quotation.items.map(async (item) => {
    try {
      const variant = await getServerPricedVariant(item.variantId);
      return variant ? { variantId: item.variantId, rate: variant.rate, rateUnit: `per ${variant.rateUnit}`, found: true } : { variantId: item.variantId, rate: item.rate, rateUnit: item.rateUnit, found: false };
    } catch {
      return { variantId: item.variantId, rate: item.rate, rateUnit: item.rateUnit, found: false };
    }
  }));
}

export async function updateAdminQuotation(id: string, patch: AdminQuotationPatch): Promise<QuotationRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const now = new Date().toISOString();
  if (mode === "mock") {
    const index = developmentStore().quotations.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const existing = developmentStore().quotations[index];
    const status = nextQuotationStatusForPatch(existing, patch);
    const quotation: QuotationRecord = {
      ...existing,
      ...patch,
      ...(status ? { status } : {}),
      followUpAt: patch.followUpAt === undefined ? existing.followUpAt : patch.followUpAt || undefined,
      followUpNote: patch.followUpNote === undefined ? existing.followUpNote : patch.followUpNote || undefined,
      internalNotes: patch.internalNotes === undefined ? existing.internalNotes : patch.internalNotes || undefined,
      lostReason: patch.lostReason === undefined ? existing.lostReason : patch.lostReason || undefined,
      validUntil: patch.validUntil === undefined ? existing.validUntil : patch.validUntil || undefined,
      lastSentAt: status === "sent" ? now : existing.lastSentAt,
      lastViewedAt: status === "viewed" ? now : existing.lastViewedAt,
    };
    developmentStore().quotations[index] = quotation;
    return quotation;
  }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const current = await getAdminQuotation(id);
  if (!current) return null;
  const status = nextQuotationStatusForPatch(current.quotation, patch);
  const update = {
    ...(status ? { status } : {}),
    ...(patch.followUpAt !== undefined ? { follow_up_at: patch.followUpAt || null } : {}),
    ...(patch.followUpNote !== undefined ? { follow_up_note: patch.followUpNote || null } : {}),
    ...(patch.internalNotes !== undefined ? { internal_notes: patch.internalNotes || null } : {}),
    ...(patch.lostReason !== undefined ? { lost_reason: patch.lostReason || null } : {}),
    ...(patch.validUntil !== undefined ? { valid_until: patch.validUntil || null } : {}),
    ...(status === "sent" ? { last_sent_at: now } : {}),
    ...(status === "viewed" ? { last_viewed_at: now } : {}),
  };
  const { data, error } = await client.from("quotations").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not update the quotation.");
  if (!data) return null;
  return (await getAdminQuotation(id))?.quotation || quotationFromRow(data as Record<string, unknown>);
}

/** Attaches a quotation to its canonical sales records without changing its commercial snapshot. */
export async function linkQuotationToSales(id: string, links: { customerId: string; accountId?: string; projectId?: string; enquiryId?: string }): Promise<QuotationRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().quotations.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const quotation = { ...developmentStore().quotations[index], customerId: links.customerId, accountId: links.accountId, projectId: links.projectId, enquiryId: links.enquiryId };
    developmentStore().quotations[index] = quotation;
    return quotation;
  }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("quotations").update({ customer_id: links.customerId, account_id: links.accountId || null, project_id: links.projectId || null, enquiry_id: links.enquiryId || null }).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not link the quotation to Sales records.");
  if (!data) return null;
  return (await getAdminQuotation(id))?.quotation || quotationFromRow(data as Record<string, unknown>);
}

function revisionNumberAndQuoteNumber(source: QuotationRecord, family: QuotationRecord[]) {
  const revisionNumber = Math.max(source.revisionNumber || 0, ...family.map((quotation) => quotation.revisionNumber || 0)) + 1;
  const rootQuoteNumber = source.quoteNumber.replace(/-R\d+$/i, "");
  return { revisionNumber, quoteNumber: `${rootQuoteNumber}-R${revisionNumber}` };
}

function revisedLineItems(items: CreateQuotationRevisionInput["items"]): QuotationLineRecord[] {
  return items.map((item) => ({ ...item, amount: item.customBuiltUp?.quotedOverrideAmount ?? item.customBuiltUp?.calculatedBasicAmount ?? Number((item.suppliedQuantity * item.rate).toFixed(2)), provisional: true }));
}

export async function createAdminQuotationRevision(id: string, input: CreateQuotationRevisionInput): Promise<QuotationRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const createdAt = new Date().toISOString();
  if (mode === "mock") {
    const store = developmentStore(); const source = store.quotations.find((quotation) => quotation.id === id);
    if (!source) return null;
    const rootId = source.parentQuotationId || source.id;
    const family = store.quotations.filter((quotation) => quotation.id === rootId || quotation.parentQuotationId === rootId);
    const identity = revisionNumberAndQuoteNumber(source, family); const items = revisedLineItems(input.items); const subtotal = Number(items.reduce((total, item) => total + item.amount, 0).toFixed(2)); const gstAmount = Number((subtotal * (input.gstRate / 100)).toFixed(2));
    const quotation: QuotationRecord = { ...source, id: randomUUID(), quoteNumber: identity.quoteNumber, accessToken: randomUUID().replaceAll("-", ""), customer: input.customer, items, subtotal, gstRate: input.gstRate, gstAmount, total: Number((subtotal + gstAmount).toFixed(2)), validUntil: input.validUntil || validityDate(createdAt, source.validityDays), internalNotes: input.internalNotes || source.internalNotes, source: "admin_created", revisionNumber: identity.revisionNumber, parentQuotationId: rootId, status: "revised", createdAt };
    store.quotations.unshift(quotation);
    store.quotationNotes.unshift({ id: randomUUID(), quotationId: quotation.id, note: `Revision ${identity.revisionNumber} created: ${input.reason}`, createdAt });
    store.quotationNotes.unshift({ id: randomUUID(), quotationId: source.id, note: `Revision ${identity.revisionNumber} created as ${identity.quoteNumber}: ${input.reason}`, createdAt });
    return quotation;
  }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data: sourceRow, error: sourceError } = await client.from("quotations").select("*").eq("id", id).maybeSingle();
  if (sourceError) throw new Error("Could not load the quotation to revise.");
  if (!sourceRow) return null;
  const source = quotationFromRow(sourceRow as Record<string, unknown>); const rootId = source.parentQuotationId || source.id;
  const { data: familyRows, error: familyError } = await client.from("quotations").select("id, quote_number, revision_number, parent_quotation_id").or(`id.eq.${rootId},parent_quotation_id.eq.${rootId}`);
  if (familyError) throw new Error("Could not prepare the quotation revision.");
  const family = (familyRows || []).map((row) => ({ ...source, id: String(row.id), quoteNumber: String(row.quote_number), revisionNumber: Number(row.revision_number || 0), parentQuotationId: row.parent_quotation_id ? String(row.parent_quotation_id) : undefined }));
  const identity = revisionNumberAndQuoteNumber(source, family); const items = revisedLineItems(input.items); const subtotal = Number(items.reduce((total, item) => total + item.amount, 0).toFixed(2)); const gstAmount = Number((subtotal * (input.gstRate / 100)).toFixed(2)); const validUntil = input.validUntil || source.validUntil || validityDate(createdAt, source.validityDays);
  const { data: revisionRow, error: insertError } = await client.from("quotations").insert({ quote_number: identity.quoteNumber, access_token: randomUUID().replaceAll("-", ""), customer: input.customer, customer_id: source.customerId || null, project_id: source.projectId || null, enquiry_id: source.enquiryId || null, subtotal, gst_rate: input.gstRate, gst_amount: gstAmount, total: Number((subtotal + gstAmount).toFixed(2)), transport: source.transport, payment_terms: source.paymentTerms, validity_days: source.validityDays, valid_until: validUntil, source: "admin_created", revision_number: identity.revisionNumber, parent_quotation_id: rootId, status: "revised", is_provisional: true, internal_notes: input.internalNotes || source.internalNotes || null }).select("*").single();
  if (insertError || !revisionRow) throw new Error("Could not create the revised quotation.");
  await persistQuotationItems(client, revisionRow.id, items);
  await client.from("quotation_notes").insert([{ quotation_id: revisionRow.id, note: `Revision ${identity.revisionNumber} created: ${input.reason}` }, { quotation_id: source.id, note: `Revision ${identity.revisionNumber} created as ${identity.quoteNumber}: ${input.reason}` }]);
  return quotationFromRow(revisionRow as Record<string, unknown>, items.map((item) => ({ variant_id: item.variantId, product_name: item.productName, configuration: item.configuration, requested_quantity: item.requestedQuantity, requested_unit: item.requestedUnit, supplied_quantity: item.suppliedQuantity, supplied_unit: item.suppliedUnit, cartons: item.cartons, technical_quantity: item.technicalQuantity, quoted_rate: item.rate, rate_unit: item.rateUnit, amount: item.amount })));
}

export async function addAdminQuotationNote(quotationId: string, note: string, adminId?: string): Promise<QuotationNote> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const entry: QuotationNote = { id: randomUUID(), quotationId, note, createdAt: new Date().toISOString() };
  if (mode === "mock") { developmentStore().quotationNotes.unshift(entry); return entry; }
  if (mode === "unconfigured") throw new Error("Quotation storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("quotation_notes").insert({ quotation_id: quotationId, note, created_by: adminId || null }).select("id, quotation_id, note, created_at").single();
  if (error || !data) throw new Error("Could not add the quotation note.");
  return { id: data.id, quotationId: data.quotation_id, note: data.note, createdAt: data.created_at };
}

/** Development-only inspection used by the mock admin route and integration tests. */
export function listDevelopmentQuotations(): QuotationRecord[] {
  return developmentStore().quotations;
}
