import "server-only";

import { randomUUID } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { QuotationRateCardRecord, RateCardHistoryRecord } from "@/lib/db/types";
import { quotationVariants, type QuoteVariant } from "@/lib/quotations/catalogue";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type DevelopmentStore = { cards: QuotationRateCardRecord[]; history: RateCardHistoryRecord[] };

function variantToCard(variant: QuoteVariant): QuotationRateCardRecord {
  return { id: variant.id, productSlug: variant.productId, productName: variant.productName, materialClass: variant.materialClass, thickness: variant.thickness, sizeLabel: variant.size, lamination: variant.lamination, orderUnit: variant.orderUnit, rate: variant.rate, rateUnit: variant.rateUnit, rollAreaM2: variant.rollAreaM2, packRunningMetres: variant.packRunningMetres, packingLabel: variant.orderUnit === "carton" ? `${variant.packTubes || 1} tubes / carton` : variant.orderUnit === "drum" ? `${variant.packLitres || 1} L / drum` : variant.packUnitLabel, moq: 1, gstRate: 18, active: true, validFrom: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
}
function developmentStore(): DevelopmentStore {
  const catalogueCards = quotationVariants.map(variantToCard);
  const store = persistentDevelopmentStore<DevelopmentStore>("rate-cards", () => ({ cards: catalogueCards, history: [] }));

  // Reconcile newly added catalogue variants without overwriting Admin-managed
  // local rates that have already been persisted.
  const existingIds = new Set(store.cards.map((card) => card.id));
  const newCards = catalogueCards.filter((card) => !existingIds.has(card.id));
  if (newCards.length) store.cards.push(...newCards);
  return store;
}

export type RateCardInput = Omit<QuotationRateCardRecord, "id" | "createdAt" | "publishedAt" | "archivedAt" | "productName">;
export type RateCardPatch = Partial<Pick<QuotationRateCardRecord, "rate" | "gstRate" | "active" | "validFrom" | "validTo" | "reason" | "packingLabel" | "moq" | "rollAreaM2" | "packRunningMetres" | "archivedAt">>;
export class RateCardConflictError extends Error {}

function toRateCard(row: Record<string, unknown>): QuotationRateCardRecord { return { id: String(row.id), productSlug: String(row.product_slug || ""), materialClass: String(row.material_class || ""), thickness: String(row.thickness || ""), sizeLabel: String(row.size_label || ""), lamination: String(row.lamination || ""), orderUnit: row.order_unit as QuotationRateCardRecord["orderUnit"], rate: Number(row.rate || 0), rateUnit: String(row.rate_unit || ""), rollAreaM2: row.roll_area_m2 ? Number(row.roll_area_m2) : undefined, packRunningMetres: row.pack_running_metres ? Number(row.pack_running_metres) : undefined, packingLabel: row.packing_label ? String(row.packing_label) : undefined, moq: row.moq ? Number(row.moq) : undefined, gstRate: Number(row.gst_rate || 18), active: Boolean(row.active), validFrom: row.valid_from ? String(row.valid_from) : undefined, validTo: row.valid_to ? String(row.valid_to) : undefined, reason: row.reason ? String(row.reason) : undefined, publishedAt: row.published_at ? String(row.published_at) : undefined, archivedAt: row.archived_at ? String(row.archived_at) : undefined, createdAt: String(row.created_at) }; }

function decorate(card: QuotationRateCardRecord): QuotationRateCardRecord { const source = quotationVariants.find((variant) => variant.productId === card.productSlug); return { ...card, productName: card.productName || source?.productName || card.productSlug }; }

function matchesVariant(card: QuotationRateCardRecord, variant: QuoteVariant) {
  return card.productSlug === variant.productId
    && card.materialClass === variant.materialClass
    && card.thickness === variant.thickness
    && card.sizeLabel === variant.size
    && card.lamination === variant.lamination;
}

/** Returns the governed, currently valid Rate Card for quotation pricing. */
export async function getActiveRateCardForVariant(variant: QuoteVariant): Promise<QuotationRateCardRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const today = new Date().toISOString().slice(0, 10);
  if (mode === "mock") return developmentStore().cards.find((card) => matchesVariant(card, variant) && card.active && (!card.validFrom || card.validFrom <= today) && (!card.validTo || card.validTo >= today)) || null;
  if (mode === "unconfigured") return null;
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("quotation_rate_cards").select("*")
    .eq("product_slug", variant.productId).eq("material_class", variant.materialClass).eq("thickness", variant.thickness).eq("size_label", variant.size).eq("lamination", variant.lamination).eq("active", true).maybeSingle();
  if (error) throw new Error("Could not look up the approved quotation rate.");
  if (!data) return null;
  const card = decorate(toRateCard(data as Record<string, unknown>));
  return (!card.validFrom || card.validFrom <= today) && (!card.validTo || card.validTo >= today) ? card : null;
}

/**
 * Resolves many product configurations from one active Rate Card snapshot.
 * Used for the quotation-builder preview and the Admin audit; final quotation
 * generation still performs its own exact server-side lookup.
 */
export async function getActiveRateCardsForVariants(variants: readonly QuoteVariant[]): Promise<Map<string, QuotationRateCardRecord>> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const today = new Date().toISOString().slice(0, 10);
  let cards: QuotationRateCardRecord[];
  if (mode === "mock") {
    cards = developmentStore().cards;
  } else if (mode === "unconfigured") {
    return new Map();
  } else {
    const client = getSupabaseServiceClient();
    if (!client) throw new Error("Supabase service client is unavailable.");
    const { data, error } = await client.from("quotation_rate_cards").select("*").eq("active", true).limit(5000);
    if (error) throw new Error("Could not load the active quotation Rate Cards.");
    cards = (data || []).map((row) => decorate(toRateCard(row as Record<string, unknown>)));
  }
  const activeCards = cards.filter((card) => card.active && (!card.validFrom || card.validFrom <= today) && (!card.validTo || card.validTo >= today));
  const results = new Map<string, QuotationRateCardRecord>();
  variants.forEach((variant) => {
    const card = activeCards.find((candidate) => matchesVariant(candidate, variant));
    if (card) results.set(variant.id, card);
  });
  return results;
}

export async function listAdminRateCards(query = ""): Promise<QuotationRateCardRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const search = query.trim().toLowerCase();
  if (mode === "mock") return developmentStore().cards.filter((card) => !search || [card.productName, card.productSlug, card.materialClass, card.thickness, card.sizeLabel, card.lamination].join(" ").toLowerCase().includes(search));
  if (mode === "unconfigured") throw new Error("Rate-card storage is not configured."); const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("quotation_rate_cards").select("*").order("updated_at", { ascending: false }).limit(250); if (query.trim()) request = request.or(`product_slug.ilike.%${query.trim()}%,material_class.ilike.%${query.trim()}%,thickness.ilike.%${query.trim()}%,size_label.ilike.%${query.trim()}%,lamination.ilike.%${query.trim()}%`);
  const { data, error } = await request; if (error) throw new Error("Could not load rate cards."); return (data || []).map((row) => decorate(toRateCard(row as Record<string, unknown>)));
}

export async function getAdminRateCard(id: string): Promise<{ card: QuotationRateCardRecord; history: RateCardHistoryRecord[] } | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const card = developmentStore().cards.find((item) => item.id === id); return card ? { card, history: developmentStore().history.filter((entry) => entry.rateCardId === id) } : null; }
  if (mode === "unconfigured") throw new Error("Rate-card storage is not configured."); const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data, error }, { data: history, error: historyError }] = await Promise.all([client.from("quotation_rate_cards").select("*").eq("id", id).maybeSingle(), client.from("quotation_rate_card_history").select("*").eq("rate_card_id", id).order("changed_at", { ascending: false })]);
  if (error || historyError) throw new Error("Could not load the rate card."); if (!data) return null;
  return { card: decorate(toRateCard(data as Record<string, unknown>)), history: (history || []).map((row) => ({ id: row.id, rateCardId: row.rate_card_id, oldRate: row.old_rate === null ? undefined : Number(row.old_rate), newRate: Number(row.new_rate), validFrom: row.valid_from || undefined, validTo: row.valid_to || undefined, reason: row.reason, changedAt: row.changed_at })) };
}

export async function createAdminRateCard(input: RateCardInput): Promise<{ card: QuotationRateCardRecord; mode: IntegrationMode }> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (mode === "unconfigured") throw new Error("Rate-card storage is not configured.");
  if (mode === "mock") { if (developmentStore().cards.some((item) => item.productSlug === input.productSlug && item.materialClass === input.materialClass && item.thickness === input.thickness && item.sizeLabel === input.sizeLabel && item.lamination === input.lamination)) throw new RateCardConflictError("A rate card already exists for this exact product configuration."); const card = decorate({ ...input, id: randomUUID(), createdAt: new Date().toISOString(), publishedAt: input.active ? new Date().toISOString() : undefined }); developmentStore().cards.unshift(card); developmentStore().history.unshift({ id: randomUUID(), rateCardId: card.id, newRate: card.rate, validFrom: card.validFrom, validTo: card.validTo, reason: card.reason || "Initial rate card", changedAt: new Date().toISOString() }); return { card, mode }; }
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("quotation_rate_cards").insert({ product_slug: input.productSlug, material_class: input.materialClass, thickness: input.thickness, size_label: input.sizeLabel, lamination: input.lamination, order_unit: input.orderUnit, rate: input.rate, rate_unit: input.rateUnit, roll_area_m2: input.rollAreaM2 || null, pack_running_metres: input.packRunningMetres || null, packing_label: input.packingLabel || null, moq: input.moq || null, gst_rate: input.gstRate, active: input.active, valid_from: input.validFrom || null, valid_to: input.validTo || null, reason: input.reason || null, published_at: input.active ? new Date().toISOString() : null }).select("*").single();
  if (error || !data) { if (error?.code === "23505") throw new RateCardConflictError("A rate card already exists for this exact product configuration."); throw new Error("Could not create the rate card."); }
  const card = decorate(toRateCard(data as Record<string, unknown>)); await client.from("quotation_rate_card_history").insert({ rate_card_id: card.id, old_rate: null, new_rate: card.rate, valid_from: card.validFrom || null, valid_to: card.validTo || null, reason: card.reason || "Initial rate card" }); return { card, mode };
}

export async function updateAdminRateCard(id: string, patch: RateCardPatch, adminId?: string): Promise<QuotationRateCardRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const now = new Date().toISOString();
  if (mode === "mock") { const index = developmentStore().cards.findIndex((item) => item.id === id); if (index < 0) return null; const before = developmentStore().cards[index]; const card = { ...before, ...patch, active: patch.active === undefined ? before.active : patch.active, publishedAt: patch.active === true && !before.active ? now : before.publishedAt, archivedAt: patch.archivedAt === undefined ? before.archivedAt : patch.archivedAt || undefined }; developmentStore().cards[index] = card; if (patch.rate !== undefined && patch.rate !== before.rate) developmentStore().history.unshift({ id: randomUUID(), rateCardId: id, oldRate: before.rate, newRate: patch.rate, validFrom: card.validFrom, validTo: card.validTo, reason: patch.reason || "Rate updated by Admin", changedAt: now }); return card; }
  if (mode === "unconfigured") throw new Error("Rate-card storage is not configured."); const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable."); const { data: previous, error: previousError } = await client.from("quotation_rate_cards").select("rate").eq("id", id).maybeSingle(); if (previousError) throw new Error("Could not load the previous rate."); if (!previous) return null;
  const update = { ...(patch.rate !== undefined ? { rate: patch.rate } : {}), ...(patch.gstRate !== undefined ? { gst_rate: patch.gstRate } : {}), ...(patch.active !== undefined ? { active: patch.active } : {}), ...(patch.validFrom !== undefined ? { valid_from: patch.validFrom || null } : {}), ...(patch.validTo !== undefined ? { valid_to: patch.validTo || null } : {}), ...(patch.reason !== undefined ? { reason: patch.reason || null } : {}), ...(patch.packingLabel !== undefined ? { packing_label: patch.packingLabel || null } : {}), ...(patch.moq !== undefined ? { moq: patch.moq || null } : {}), ...(patch.rollAreaM2 !== undefined ? { roll_area_m2: patch.rollAreaM2 || null } : {}), ...(patch.packRunningMetres !== undefined ? { pack_running_metres: patch.packRunningMetres || null } : {}), ...(patch.archivedAt !== undefined ? { archived_at: patch.archivedAt || null } : {}), ...(patch.active === true ? { published_at: now } : {}) };
  const { data, error } = await client.from("quotation_rate_cards").update(update).eq("id", id).select("*").maybeSingle(); if (error) throw new Error("Could not update the rate card."); if (!data) return null; const card = decorate(toRateCard(data as Record<string, unknown>)); if (patch.rate !== undefined && patch.rate !== Number(previous.rate)) { const { error: historyError } = await client.from("quotation_rate_card_history").insert({ rate_card_id: id, old_rate: previous.rate, new_rate: patch.rate, valid_from: card.validFrom || null, valid_to: card.validTo || null, reason: patch.reason || "Rate updated by Admin", changed_by: adminId || null }); if (historyError) throw new Error("The rate changed, but its audit entry could not be saved."); } return card;
}

export function quotationRateOptions() { return quotationVariants.map((variant) => ({ id: variant.id, productSlug: variant.productId, productName: variant.productName, materialClass: variant.materialClass, thickness: variant.thickness, sizeLabel: variant.size, lamination: variant.lamination, orderUnit: variant.orderUnit, rate: variant.rate, rateUnit: variant.rateUnit, rollAreaM2: variant.rollAreaM2, packRunningMetres: variant.packRunningMetres, packingLabel: variant.orderUnit === "carton" ? `${variant.packTubes || 1} tubes / carton` : variant.orderUnit === "drum" ? `${variant.packLitres || 1} L / drum` : variant.packUnitLabel || "" })); }
