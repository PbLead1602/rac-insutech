import "server-only";

import { randomUUID } from "crypto";
import { catalogue } from "@/lib/catalogue";
import type { MediaAssetRecord } from "@/lib/db/types";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

export type MediaAssetInput = Omit<MediaAssetRecord, "id" | "createdAt" | "archivedAt">;
export type MediaAssetPatch = Partial<MediaAssetInput> & { archived?: boolean };

function mimeFor(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : extension === "svg" ? "image/svg+xml" : extension === "pdf" ? "application/pdf" : "image/png";
}

function store() {
  return persistentDevelopmentStore<MediaAssetRecord[]>("media", () => {
    const uniqueImages = [...new Set(catalogue.map((product) => product.image))];
    return uniqueImages.map((storagePath, index) => {
      const fileName = storagePath.split("/").pop() || `rac-media-${index + 1}.png`;
      return { id: `media-${index + 1}`, fileName, storagePath, mimeType: mimeFor(fileName), altText: "RAC Insutech insulation material", visibility: "public", createdAt: new Date().toISOString() };
    });
  });
}

function toMedia(row: Record<string, unknown>): MediaAssetRecord {
  return { id: String(row.id), fileName: String(row.file_name || ""), storagePath: String(row.storage_path || ""), mimeType: String(row.mime_type || "application/octet-stream"), sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? undefined : Number(row.size_bytes), width: row.width === null || row.width === undefined ? undefined : Number(row.width), height: row.height === null || row.height === undefined ? undefined : Number(row.height), altText: row.alt_text ? String(row.alt_text) : undefined, visibility: row.visibility === "public" ? "public" : "internal", createdAt: String(row.created_at), archivedAt: row.archived_at ? String(row.archived_at) : undefined };
}

export async function listAdminMedia(query = ""): Promise<MediaAssetRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const search = query.trim().toLowerCase();
  if (mode === "mock") return store().filter((item) => !search || [item.fileName, item.storagePath, item.altText, item.visibility].join(" ").toLowerCase().includes(search));
  if (mode === "unconfigured") throw new Error("Media storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("media_assets").select("*").order("created_at", { ascending: false }).limit(300);
  if (error) throw new Error("Could not load media assets.");
  return (data || []).map((row) => toMedia(row as Record<string, unknown>)).filter((item) => !search || [item.fileName, item.storagePath, item.altText, item.visibility].join(" ").toLowerCase().includes(search));
}

export async function createAdminMedia(input: MediaAssetInput): Promise<{ asset: MediaAssetRecord; mode: IntegrationMode }> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Media storage is not configured.");
  if (mode === "mock") {
    if (store().some((item) => item.storagePath === input.storagePath)) throw new Error("That media path is already registered.");
    const asset: MediaAssetRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    store().unshift(asset);
    return { asset, mode };
  }
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("media_assets").insert({ file_name: input.fileName, storage_path: input.storagePath, mime_type: input.mimeType, size_bytes: input.sizeBytes || null, width: input.width || null, height: input.height || null, alt_text: input.altText || null, visibility: input.visibility }).select("*").single();
  if (error || !data) throw new Error("Could not register the media asset.");
  return { asset: toMedia(data as Record<string, unknown>), mode };
}

export async function updateAdminMedia(id: string, patch: MediaAssetPatch): Promise<MediaAssetRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = store().findIndex((item) => item.id === id);
    if (index < 0) return null;
    const { archived, ...details } = patch;
    const asset = { ...store()[index], ...details, ...(archived === undefined ? {} : { archivedAt: archived ? new Date().toISOString() : undefined }) };
    store()[index] = asset;
    return asset;
  }
  if (mode === "unconfigured") throw new Error("Media storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { ...(patch.fileName !== undefined ? { file_name: patch.fileName } : {}), ...(patch.storagePath !== undefined ? { storage_path: patch.storagePath } : {}), ...(patch.mimeType !== undefined ? { mime_type: patch.mimeType } : {}), ...(patch.sizeBytes !== undefined ? { size_bytes: patch.sizeBytes || null } : {}), ...(patch.width !== undefined ? { width: patch.width || null } : {}), ...(patch.height !== undefined ? { height: patch.height || null } : {}), ...(patch.altText !== undefined ? { alt_text: patch.altText || null } : {}), ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}), ...(patch.archived !== undefined ? { archived_at: patch.archived ? new Date().toISOString() : null } : {}) };
  const { data, error } = await client.from("media_assets").update(update).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not update the media asset.");
  return data ? toMedia(data as Record<string, unknown>) : null;
}
export async function permanentlyDeleteAdminMedia(id: string): Promise<boolean> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const index = store().findIndex((item) => item.id === id && item.archivedAt); if (index < 0) return false; store().splice(index, 1); return true; }
  if (mode === "unconfigured") throw new Error("Media storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("media_assets").delete().eq("id", id).not("archived_at", "is", null).select("id");
  if (error) throw new Error("Could not permanently delete the archived media asset record.");
  return Boolean(data?.length);
}
