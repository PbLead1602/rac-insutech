import "server-only";

import { randomUUID } from "crypto";
import { catalogue } from "@/lib/catalogue";
import type { DocumentRecord } from "@/lib/db/types";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type Store = { documents: DocumentRecord[] };
export type DocumentInput = Omit<DocumentRecord, "id" | "createdAt">;

function store(): Store {
  return persistentDevelopmentStore("documents", () => {
    const createdAt = new Date().toISOString();
    return { documents: catalogue.map((product) => ({
      id: `brief-${product.slug}`, title: `${product.name} — RAC product brief`, documentType: "brochure" as const,
      productId: product.slug, materialFamily: product.family, version: "1.0", fileUrl: `/brochures/${product.slug}`,
      visibility: "public" as const, status: "current" as const, createdAt,
    })) };
  });
}

function toDocument(row: Record<string, unknown>): DocumentRecord {
  return { id: String(row.id), title: String(row.title || ""), documentType: String(row.document_type || "other") as DocumentRecord["documentType"], productId: row.product_id ? String(row.product_id) : undefined, materialFamily: row.material_family ? String(row.material_family) : undefined, version: row.version ? String(row.version) : undefined, documentDate: row.document_date ? String(row.document_date) : undefined, fileUrl: String(row.file_url || ""), visibility: String(row.visibility || "internal") as DocumentRecord["visibility"], status: String(row.status || "current") as DocumentRecord["status"], replacedById: row.replaced_by_id ? String(row.replaced_by_id) : undefined, createdAt: String(row.created_at) };
}

export async function listAdminDocuments(query = ""): Promise<DocumentRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const search = query.trim().toLowerCase();
  if (mode === "mock") return store().documents.filter((item) => !search || [item.title, item.documentType, item.productId, item.materialFamily, item.version, item.visibility, item.status].join(" ").toLowerCase().includes(search));
  if (mode === "unconfigured") throw new Error("Document storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("documents").select("*").order("created_at", { ascending: false }).limit(300);
  if (query.trim()) request = request.or(`title.ilike.%${query.trim()}%,material_family.ilike.%${query.trim()}%,version.ilike.%${query.trim()}%`);
  const { data, error } = await request; if (error) throw new Error("Could not load documents."); return (data || []).map((row) => toDocument(row as Record<string, unknown>));
}

export async function createAdminDocument(input: DocumentInput): Promise<{ document: DocumentRecord; mode: IntegrationMode }> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (mode === "unconfigured") throw new Error("Document storage is not configured.");
  if (mode === "mock") { const document = { ...input, id: randomUUID(), createdAt: new Date().toISOString() }; store().documents.unshift(document); return { document, mode }; }
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("documents").insert({ title: input.title, document_type: input.documentType, product_id: input.productId || null, material_family: input.materialFamily || null, version: input.version || null, document_date: input.documentDate || null, file_url: input.fileUrl, visibility: input.visibility, status: input.status, replaced_by_id: input.replacedById || null }).select("*").single();
  if (error || !data) throw new Error("Could not create the document record."); return { document: toDocument(data as Record<string, unknown>), mode };
}

export async function updateAdminDocument(id: string, patch: Partial<DocumentInput>): Promise<DocumentRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const index = store().documents.findIndex((item) => item.id === id); if (index < 0) return null; const document = { ...store().documents[index], ...patch }; store().documents[index] = document; return document; }
  if (mode === "unconfigured") throw new Error("Document storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.documentType !== undefined ? { document_type: patch.documentType } : {}), ...(patch.productId !== undefined ? { product_id: patch.productId || null } : {}), ...(patch.materialFamily !== undefined ? { material_family: patch.materialFamily || null } : {}), ...(patch.version !== undefined ? { version: patch.version || null } : {}), ...(patch.documentDate !== undefined ? { document_date: patch.documentDate || null } : {}), ...(patch.fileUrl !== undefined ? { file_url: patch.fileUrl } : {}), ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}), ...(patch.status !== undefined ? { status: patch.status } : {}), ...(patch.replacedById !== undefined ? { replaced_by_id: patch.replacedById || null } : {}) };
  const { data, error } = await client.from("documents").update(update).eq("id", id).select("*").maybeSingle(); if (error) throw new Error("Could not update the document record."); return data ? toDocument(data as Record<string, unknown>) : null;
}
export async function permanentlyDeleteAdminDocument(id: string): Promise<boolean> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const index = store().documents.findIndex((item) => item.id === id && item.status === "archived"); if (index < 0) return false; store().documents.splice(index, 1); return true; }
  if (mode === "unconfigured") throw new Error("Document storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("documents").delete().eq("id", id).eq("status", "archived").select("id");
  if (error) throw new Error("Could not permanently delete the archived document record.");
  return Boolean(data?.length);
}
