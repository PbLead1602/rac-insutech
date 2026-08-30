import "server-only";

import { randomUUID } from "crypto";
import { integrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { analyseXlsxRateList, type RateImportAnalysis, type RateImportProfileId } from "@/lib/rates/xlsx-rate-import";
import { createAdminRateCard, listAdminRateCards, updateAdminRateCard, type RateCardInput } from "@/lib/repositories/rates";

type ImportStore = { analyses: Map<string, RateImportAnalysis> };
const globalStore = globalThis as typeof globalThis & { __racRateImportStore?: ImportStore };
function store() { if (!globalStore.__racRateImportStore) globalStore.__racRateImportStore = { analyses: new Map() }; return globalStore.__racRateImportStore; }

export async function analyseAdminRateImport(input: { fileName: string; bytes: Uint8Array; profile: RateImportProfileId }) {
  const analysis = analyseXlsxRateList({ ...input, requestedProfile: input.profile, existing: await listAdminRateCards() });
  store().analyses.set(analysis.id, analysis);
  return analysis;
}

function inputFromRow(row: NonNullable<RateImportAnalysis["rows"][number]["mapping"]>): RateCardInput {
  return { productSlug: row.productSlug, materialClass: row.materialClass, thickness: row.thickness, sizeLabel: row.sizeLabel, lamination: row.lamination, orderUnit: row.orderUnit, rate: row.rate, rateUnit: row.rateUnit, rollAreaM2: row.rollAreaM2, packRunningMetres: row.packRunningMetres, packingLabel: row.packingLabel || "", moq: 1, gstRate: 18, active: true, validFrom: new Date().toISOString().slice(0, 10), validTo: "", reason: "" };
}

async function recordImport(analysis: RateImportAnalysis, selectedIds: Set<string>, applied: Map<string, string>, adminId?: string) {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const confirmedAt = new Date().toISOString();
  if (mode === "mock") return;
  const client = getSupabaseServiceClient(); if (!client) return;
  const { data: imported, error } = await client.from("rate_imports").insert({ source_file_name: analysis.fileName, source_file_size: analysis.fileSize, file_hash: analysis.fileHash, profile: analysis.profileId, detected_sheets: analysis.sheets, analysed_at: analysis.analysedAt, confirmed_at: confirmedAt, status: "confirmed", summary: analysis.summary, created_by: adminId || null }).select("id").single();
  if (error || !imported) throw new Error("Rates were changed, but the source-import audit record could not be saved.");
  const rows = analysis.rows.map((row) => ({ import_id: imported.id, source_row: row.sourceRow, source_data: row.source, mapping: row.mapping || {}, action: selectedIds.has(row.id) ? row.action : "not_selected", confidence: row.confidence, validation_issues: row.issues, previous_rate: row.oldRate ?? null, imported_rate: row.mapping?.rate ?? null, applied_rate_card_id: applied.get(row.id) || null }));
  const { error: rowError } = await client.from("rate_import_rows").insert(rows); if (rowError) throw new Error("Rates were changed, but their import-row audit could not be saved.");
}

export async function confirmAdminRateImport(input: { importId: string; selectedRowIds: string[]; adminId?: string }) {
  const analysis = store().analyses.get(input.importId); if (!analysis) throw new Error("This import review has expired. Upload the workbook again before confirming.");
  const selected = new Set(input.selectedRowIds); const eligible = analysis.rows.filter((row) => selected.has(row.id) && (row.action === "create" || row.action === "update") && row.mapping);
  if (!eligible.length) throw new Error("Select at least one valid new or changed rate before confirming.");
  const applied = new Map<string, string>(); let created = 0; let updated = 0;
  for (const row of eligible) {
    const reason = `Imported from ${analysis.fileName} on ${new Date().toLocaleDateString("en-GB")}; profile: ${analysis.profileName}.`;
    if (row.action === "create") {
      const result = await createAdminRateCard({ ...inputFromRow(row.mapping!), reason }); applied.set(row.id, result.card.id); created += 1;
    } else if (row.existingRateCardId) {
      const card = await updateAdminRateCard(row.existingRateCardId, { rate: row.mapping!.rate, active: row.reactivate ? true : undefined, reason }, input.adminId);
      if (!card) throw new Error(`The Rate Card for source row ${row.sourceRow} no longer exists. Re-analyse the workbook before confirming.`);
      applied.set(row.id, card.id); updated += 1;
    }
  }
  await recordImport(analysis, selected, applied, input.adminId);
  store().analyses.delete(input.importId);
  return { created, updated, skipped: analysis.rows.length - eligible.length, fileName: analysis.fileName };
}

export function rateImportProfileExists(value: string): value is RateImportProfileId {
  return ["auto", "xlpe-tubes", "nitrile-tube-class-1", "nitrile-tube-class-o", "sheet-insulation", "insulation-tape", "insulation-adhesive"].includes(value);
}
