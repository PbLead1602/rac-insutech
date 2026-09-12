import "server-only";

import { randomUUID } from "crypto";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { analyseXlsxRateList, rateImportProfiles, reconcileImportedRateConfiguration, type ImportedRateConfiguration, type RateImportAction, type RateImportAnalysis, type RateImportConfidence, type RateImportProfileId, type RateImportRow } from "@/lib/rates/xlsx-rate-import";
import { createAdminRateCard, listAdminRateCards, updateAdminRateCard, type RateCardInput } from "@/lib/repositories/rates";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type DevelopmentImportStore = { analyses: RateImportAnalysis[] };
type ReviewMetadata = { existingRateCardId?: string; reactivate?: boolean; sheetName: string };
type PreparedRateUpdate = { rateCardId: string; expectedPreviousRate: number; newRate: number; reactivate: boolean; reason: string; adminId?: string };

function developmentStore() {
  return persistentDevelopmentStore<DevelopmentImportStore>("rate-import-reviews", () => ({ analyses: [] }));
}

function profileName(profileId: string) {
  return rateImportProfiles.find((profile) => profile.id === profileId)?.name || profileId;
}

function reviewMapping(row: RateImportRow): Record<string, unknown> {
  return {
    ...(row.mapping || {}),
    __racImportReview: {
      existingRateCardId: row.existingRateCardId,
      reactivate: row.reactivate,
      sheetName: row.sheetName,
    } satisfies ReviewMetadata,
  };
}

function restoreAnalysisRow(row: Record<string, unknown>): RateImportRow {
  const rawMapping = row.mapping && typeof row.mapping === "object" && !Array.isArray(row.mapping) ? row.mapping as Record<string, unknown> : {};
  const metadata = rawMapping.__racImportReview && typeof rawMapping.__racImportReview === "object" && !Array.isArray(rawMapping.__racImportReview)
    ? rawMapping.__racImportReview as ReviewMetadata
    : { sheetName: "Imported rate list" };
  const { __racImportReview: _review, ...mapping } = rawMapping;
  const source = row.source_data && typeof row.source_data === "object" && !Array.isArray(row.source_data)
    ? Object.fromEntries(Object.entries(row.source_data as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]))
    : {};
  return {
    id: String(row.id),
    sourceRow: Number(row.source_row || 0),
    sheetName: metadata.sheetName || "Imported rate list",
    source,
    ...(Object.keys(mapping).length ? { mapping: mapping as ImportedRateConfiguration } : {}),
    action: String(row.action) as RateImportAction,
    confidence: String(row.confidence) as RateImportConfidence,
    issues: Array.isArray(row.validation_issues) ? row.validation_issues.map(String) : [],
    ...(row.previous_rate === null || row.previous_rate === undefined ? {} : { oldRate: Number(row.previous_rate) }),
    ...(metadata.existingRateCardId ? { existingRateCardId: metadata.existingRateCardId } : {}),
    ...(metadata.reactivate ? { reactivate: true } : {}),
  };
}

async function saveReviewedImport(analysis: RateImportAnalysis, adminId?: string) {
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { error } = await client.from("rate_imports").insert({
    id: analysis.id,
    source_file_name: analysis.fileName,
    source_file_size: analysis.fileSize,
    file_hash: analysis.fileHash,
    profile: analysis.profileId,
    detected_sheets: analysis.sheets,
    analysed_at: analysis.analysedAt,
    status: "reviewed",
    summary: analysis.summary,
    created_by: adminId || null,
  });
  if (error) throw new Error("Could not save the Rate Card import review.");
  const rows = analysis.rows.map((row) => ({
    id: row.id,
    import_id: analysis.id,
    source_row: row.sourceRow,
    source_data: row.source,
    mapping: reviewMapping(row),
    action: row.action,
    confidence: row.confidence,
    validation_issues: row.issues,
    previous_rate: row.oldRate ?? null,
    imported_rate: row.mapping?.rate ?? null,
  }));
  const { error: rowsError } = await client.from("rate_import_rows").insert(rows);
  if (rowsError) {
    await client.from("rate_imports").delete().eq("id", analysis.id);
    throw new Error("Could not save the Rate Card import review rows.");
  }
}

async function loadReviewedImport(importId: string): Promise<RateImportAnalysis | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().analyses.find((analysis) => analysis.id === importId) || null;
  if (mode === "unconfigured") return null;

  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data: importRecord, error } = await client.from("rate_imports").select("*").eq("id", importId).eq("status", "reviewed").maybeSingle();
  if (error) throw new Error("Could not load the Rate Card import review.");
  if (!importRecord) return null;
  const { data: importedRows, error: rowsError } = await client.from("rate_import_rows").select("*").eq("import_id", importId).order("source_row", { ascending: true });
  if (rowsError) throw new Error("Could not load the Rate Card import review rows.");
  const record = importRecord as Record<string, unknown>;
  const summary = record.summary && typeof record.summary === "object" ? record.summary as Record<RateImportAction, number> : { create: 0, update: 0, unchanged: 0, invalid: 0, duplicate: 0 };
  return {
    id: String(record.id),
    fileName: String(record.source_file_name || "rate-list.xlsx"),
    fileSize: Number(record.source_file_size || 0),
    fileHash: String(record.file_hash || ""),
    profileId: String(record.profile) as Exclude<RateImportProfileId, "auto">,
    profileName: profileName(String(record.profile)),
    analysedAt: String(record.analysed_at || record.created_at || new Date().toISOString()),
    sheets: Array.isArray(record.detected_sheets) ? record.detected_sheets.map(String) : [],
    rows: (importedRows || []).map((row) => restoreAnalysisRow(row as Record<string, unknown>)),
    summary,
  };
}

export async function analyseAdminRateImport(input: { fileName: string; bytes: Uint8Array; profile: RateImportProfileId; adminId?: string }) {
  const analysis = analyseXlsxRateList({ ...input, requestedProfile: input.profile, existing: await listAdminRateCards() });
  // Database IDs and selected-row IDs must be durable UUIDs so a review can
  // safely move between server instances before the Admin confirms it.
  analysis.id = randomUUID();
  analysis.rows = analysis.rows.map((row) => ({ ...row, id: randomUUID() }));
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") developmentStore().analyses.push(analysis);
  else if (mode === "live") await saveReviewedImport(analysis, input.adminId);
  return analysis;
}

function inputFromRow(row: NonNullable<RateImportAnalysis["rows"][number]["mapping"]>): RateCardInput {
  return { productSlug: row.productSlug, materialClass: row.materialClass, thickness: row.thickness, sizeLabel: row.sizeLabel, lamination: row.lamination, orderUnit: row.orderUnit, rate: row.rate, rateUnit: row.rateUnit, rollAreaM2: row.rollAreaM2, packRunningMetres: row.packRunningMetres, packingLabel: row.packingLabel || "", moq: 1, gstRate: 18, active: true, validFrom: new Date().toISOString().slice(0, 10), validTo: "", reason: "" };
}

function isMissingRpcFunction(error: unknown, functionName: string) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (candidate.code === "PGRST202" || candidate.code === "42883") && candidate.message?.includes(functionName);
}

async function applyPreparedRateUpdates(updates: PreparedRateUpdate[]) {
  if (!updates.length) return;
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "live") {
    const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
    const { error } = await client.rpc("apply_rate_import_updates", {
      p_changes: updates.map((update) => ({
        rate_card_id: update.rateCardId,
        expected_previous_rate: update.expectedPreviousRate,
        new_rate: update.newRate,
        reactivate: update.reactivate,
        reason: update.reason,
        changed_by: update.adminId || null,
      })),
    });
    if (!error) return;
    if (!isMissingRpcFunction(error, "apply_rate_import_updates")) throw new Error("Could not apply the selected Rate Card changes. No selected rate changes were saved.");
  }

  // Compatibility path for deployments that have the application code before
  // the accompanying database migration. It retains the existing safeguards.
  for (const update of updates) {
    const card = await updateAdminRateCard(update.rateCardId, { rate: update.newRate, active: update.reactivate ? true : undefined, reason: update.reason }, update.adminId, { expectedPreviousRate: update.expectedPreviousRate });
    if (!card) throw new Error("A selected Rate Card changed after analysis. Re-analyse the workbook before confirming.");
  }
}

async function finaliseImport(analysis: RateImportAnalysis, selectedIds: Set<string>, applied: Map<string, string>) {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const confirmedAt = new Date().toISOString();
  if (mode === "mock") return;
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const auditRows = analysis.rows.map((row) => ({ id: row.id, action: selectedIds.has(row.id) ? row.action : "not_selected", applied_rate_card_id: applied.get(row.id) || null }));
  const { error: finaliseError } = await client.rpc("finalise_rate_import", { p_import_id: analysis.id, p_confirmed_at: confirmedAt, p_rows: auditRows });
  if (!finaliseError) return;
  if (!isMissingRpcFunction(finaliseError, "finalise_rate_import")) throw new Error("Rates were changed, but their import audit could not be finalised.");
  const rowUpdates = await Promise.all(analysis.rows.map((row) => client.from("rate_import_rows").update({
    action: selectedIds.has(row.id) ? row.action : "not_selected",
    applied_rate_card_id: applied.get(row.id) || null,
  }).eq("id", row.id).eq("import_id", analysis.id)));
  if (rowUpdates.some(({ error }) => error)) throw new Error("Rates were changed, but their import-row audit could not be updated.");
  const { error } = await client.from("rate_imports").update({ confirmed_at: confirmedAt, status: "confirmed" }).eq("id", analysis.id).eq("status", "reviewed");
  if (error) throw new Error("Rates were changed, but the source-import audit record could not be finalised.");
}

export async function confirmAdminRateImport(input: { importId: string; selectedRowIds: string[]; adminId?: string }) {
  const analysis = await loadReviewedImport(input.importId); if (!analysis) throw new Error("This import review has expired. Upload the workbook again before confirming.");
  const selected = new Set(input.selectedRowIds); const eligible = analysis.rows.filter((row) => selected.has(row.id) && (row.action === "create" || row.action === "update") && row.mapping);
  if (!eligible.length) throw new Error("Select at least one valid new or changed rate before confirming.");
  const currentCards = await listAdminRateCards();
  const applied = new Map<string, string>(); const pendingUpdates: PreparedRateUpdate[] = []; let created = 0; let updated = 0; let revalidatedSkipped = 0;
  for (const row of eligible) {
    const reason = `Imported from ${analysis.fileName} on ${new Date().toLocaleDateString("en-GB")}; profile: ${analysis.profileName}.`;
    const reconciliation = reconcileImportedRateConfiguration(row.mapping!, currentCards);
    if (reconciliation.action === "duplicate") throw new Error(`Source row ${row.sourceRow} matches multiple current Rate Cards. Resolve the duplicate and re-analyse the workbook.`);
    if (row.action === "create" && reconciliation.action !== "create") throw new Error(`Source row ${row.sourceRow} now matches an existing Rate Card. Re-analyse the workbook before confirming.`);
    if (row.action === "update" && reconciliation.action === "create") throw new Error(`The Rate Card for source row ${row.sourceRow} no longer exists. Re-analyse the workbook before confirming.`);
    if (row.action === "update" && reconciliation.action === "unchanged") { revalidatedSkipped += 1; continue; }
    if (row.action === "create") {
      const result = await createAdminRateCard({ ...inputFromRow(row.mapping!), reason }, { existingCards: currentCards }); applied.set(row.id, result.card.id); currentCards.push(result.card); created += 1;
    } else if (reconciliation.existingRateCard) {
      const existingCard = reconciliation.existingRateCard;
      pendingUpdates.push({ rateCardId: existingCard.id, expectedPreviousRate: existingCard.rate, newRate: row.mapping!.rate, reactivate: Boolean(reconciliation.reactivate), reason, adminId: input.adminId });
      const optimisticCard = { ...existingCard, rate: row.mapping!.rate, active: reconciliation.reactivate ? true : existingCard.active, reason };
      const index = currentCards.findIndex((candidate) => candidate.id === existingCard.id); if (index >= 0) currentCards[index] = optimisticCard;
      applied.set(row.id, existingCard.id); updated += 1;
    }
  }
  await applyPreparedRateUpdates(pendingUpdates);
  await finaliseImport(analysis, selected, applied);
  if (integrationMode(serverEnv.supabaseServiceConfigured) === "mock") developmentStore().analyses = developmentStore().analyses.filter((entry) => entry.id !== input.importId);
  return { created, updated, skipped: analysis.rows.length - eligible.length + revalidatedSkipped, fileName: analysis.fileName };
}

export function rateImportProfileExists(value: string): value is RateImportProfileId {
  return ["auto", "xlpe-tubes", "nitrile-tube-class-1", "nitrile-tube-class-o", "sheet-insulation", "insulation-tape", "insulation-adhesive"].includes(value);
}
