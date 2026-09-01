import "server-only";

import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

export type SettingRecord = { key: string; value: Record<string, unknown>; updatedAt?: string };
const quotationTerms = ["Payment terms: 100% Advance along with Order.", "Order through dealer only.", "Delivery period within 7 to 8 working days after confirmation of payment receipt.", "Unloading at customer side.", "Transportation at actual.", "Prices are basic Ex-works + 18% GST extra + transportation at actual.", "MOQ: As per standard packing.", "Thickness tolerance: +/- 1 mm.", "Validity: This offer is valid only for 7 days from the date of quotation."];
function store() { return persistentDevelopmentStore<SettingRecord[]>("settings", () => [{ key: "company_profile", value: { name: "RAC INSUTECH", address: "Rukhmini Niwas, Near Vrundavan Garden Appt. Behind Tulshan Bungalow, Geeta Nagar, Akola", website: "www.racinsutech.com", phone: "9130958594", email: "racinsutech@gmail.com", gstin: "27AKLPL9475H1ZH", state: "27-Maharashtra" } }, { key: "quotation_terms", value: { gstRate: 18, validityDays: 7, transport: "At Actual", paymentTerms: "100% Advance along with Order", terms: quotationTerms } }, { key: "contact_routing", value: { whatsapp: "919130958594", rfqRecipient: "racinsutech@gmail.com", quoteRecipient: "racinsutech@gmail.com" } }]); }
function toSetting(row: Record<string, unknown>): SettingRecord { return { key: String(row.key), value: (row.value || {}) as Record<string, unknown>, updatedAt: row.updated_at ? String(row.updated_at) : undefined }; }
export async function listAdminSettings(): Promise<SettingRecord[]> { const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (mode === "mock") return store(); if (mode === "unconfigured") throw new Error("Settings storage is not configured."); const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable."); const { data, error } = await client.from("site_settings").select("*").order("key"); if (error) throw new Error("Could not load settings."); return (data || []).map((row) => toSetting(row as Record<string, unknown>)); }
export async function saveAdminSetting(key: string, value: Record<string, unknown>): Promise<SettingRecord> { const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (mode === "mock") { const index = store().findIndex((item) => item.key === key); const record = { key, value, updatedAt: new Date().toISOString() }; if (index < 0) store().push(record); else store()[index] = record; return record; } if (mode === "unconfigured") throw new Error("Settings storage is not configured."); const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable."); const { data, error } = await client.from("site_settings").upsert({ key, value }, { onConflict: "key" }).select("*").single(); if (error || !data) throw new Error("Could not save the setting."); return toSetting(data as Record<string, unknown>); }

/** Default is governed here and can be changed by RAC in quotation settings. */
export async function getBuiltUpNbrWastagePercent() {
  const quotationTerms = (await listAdminSettings()).find((setting) => setting.key === "quotation_terms")?.value || {};
  const value = Number(quotationTerms.builtUpNbrWastagePercent);
  return Number.isFinite(value) && value >= 0 && value <= 50 ? value : 5;
}
