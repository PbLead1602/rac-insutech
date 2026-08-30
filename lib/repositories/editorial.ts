import "server-only";

import { randomUUID } from "crypto";
import { industries, services, type ContentCard } from "@/lib/site-content";
import type { EditorialKind, EditorialRecord } from "@/lib/db/types";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type Store = Record<EditorialKind, EditorialRecord[]>;
export type EditorialInput = Omit<EditorialRecord, "id" | "createdAt" | "kind">;

const applicationSeed: ContentCard[] = [
  { slug: "hvac-ducts-pipework", title: "HVAC ducts & pipework", summary: "Insulation selection for ducts, chilled-water lines, refrigerant piping and equipment.", materials: [], applications: [] },
  { slug: "cold-condensation-control", title: "Cold insulation & condensation control", summary: "Closed-cell and vapour-conscious insulation systems for cold services.", materials: [], applications: [] },
  { slug: "hot-process-insulation", title: "Hot process insulation", summary: "Thermal protection for heated utilities, equipment and process areas.", materials: [], applications: [] },
  { slug: "roof-peb-underdeck", title: "Roof, PEB & underdeck", summary: "Metal-roof and building-envelope insulation build-ups.", materials: [], applications: [] },
  { slug: "acoustic-control", title: "Acoustic control", summary: "Sound absorption, isolation and vibration-control material routes.", materials: [], applications: [] },
];

function toSeed(kind: EditorialKind, cards: ContentCard[]): EditorialRecord[] {
  const createdAt = new Date().toISOString();
  return cards.map((card) => ({ id: `${kind}-${card.slug}`, kind, name: card.title, slug: card.slug, summary: card.summary, content: [card.summary, ...card.materials, ...card.applications].filter(Boolean).join("\n"), status: "published", createdAt }));
}

function store(): Store {
  return persistentDevelopmentStore("editorial", () => ({ application: toSeed("application", applicationSeed), industry: toSeed("industry", industries), service: toSeed("service", services), resource: [] }));
}

function tableFor(kind: EditorialKind) {
  return kind === "application" ? "applications" : kind === "industry" ? "industries" : kind === "service" ? "services" : "articles";
}

function toEditorial(kind: EditorialKind, row: Record<string, unknown>): EditorialRecord {
  const resource = kind === "resource";
  const imageKey = resource ? "cover_image_url" : kind === "industry" ? "image_url" : "hero_image_url";
  const summaryKey = resource ? "excerpt" : "summary";
  return { id: String(row.id), kind, name: String(resource ? row.title || "" : row.name || ""), slug: String(row.slug || ""), summary: row[summaryKey] ? String(row[summaryKey]) : undefined, content: row.content ? String(row.content) : undefined, imageUrl: row[imageKey] ? String(row[imageKey]) : undefined, icon: row.icon ? String(row.icon) : undefined, status: String(row.status || "draft") as EditorialRecord["status"], seoTitle: row.seo_title ? String(row.seo_title) : undefined, seoDescription: row.seo_description ? String(row.seo_description) : undefined, createdAt: String(row.created_at) };
}

export async function listAdminEditorial(kind: EditorialKind, query = ""): Promise<EditorialRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const search = query.trim().toLowerCase();
  if (mode === "mock") return store()[kind].filter((item) => !search || [item.name, item.slug, item.summary, item.content, item.status].join(" ").toLowerCase().includes(search));
  if (mode === "unconfigured") throw new Error("Editorial storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from(tableFor(kind) as "articles").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Could not load editorial records.");
  return (data || []).map((row) => toEditorial(kind, row as Record<string, unknown>));
}

export async function createAdminEditorial(kind: EditorialKind, input: EditorialInput): Promise<{ record: EditorialRecord; mode: IntegrationMode }> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Editorial storage is not configured.");
  if (mode === "mock") {
    if (store()[kind].some((item) => item.slug === input.slug)) throw new Error("This URL slug is already in use.");
    const record: EditorialRecord = { ...input, id: randomUUID(), kind, createdAt: new Date().toISOString() };
    store()[kind].unshift(record);
    return { record, mode };
  }
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const payload = kind === "resource" ? { title: input.name, slug: input.slug, excerpt: input.summary || null, content: input.content || null, cover_image_url: input.imageUrl || null, status: input.status, seo_title: input.seoTitle || null, seo_description: input.seoDescription || null, published_at: input.status === "published" ? new Date().toISOString() : null } : { name: input.name, slug: input.slug, summary: input.summary || null, content: input.content || null, ...(kind === "industry" ? { image_url: input.imageUrl || null } : { hero_image_url: input.imageUrl || null }), ...(kind === "service" ? { icon: input.icon || null } : {}), status: input.status, seo_title: input.seoTitle || null, seo_description: input.seoDescription || null };
  const { data, error } = await client.from(tableFor(kind) as "articles").insert(payload as never).select("*").single();
  if (error || !data) throw new Error("Could not create the editorial record.");
  return { record: toEditorial(kind, data as Record<string, unknown>), mode };
}

export async function updateAdminEditorial(kind: EditorialKind, id: string, patch: Partial<EditorialInput>): Promise<EditorialRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = store()[kind].findIndex((item) => item.id === id);
    if (index < 0) return null;
    const record: EditorialRecord = { ...store()[kind][index], ...patch };
    store()[kind][index] = record;
    return record;
  }
  if (mode === "unconfigured") throw new Error("Editorial storage is not configured.");
  const client = getSupabaseServiceClient();
  if (!client) throw new Error("Supabase service client is unavailable.");
  const update = kind === "resource" ? { ...(patch.name !== undefined ? { title: patch.name } : {}), ...(patch.slug !== undefined ? { slug: patch.slug } : {}), ...(patch.summary !== undefined ? { excerpt: patch.summary || null } : {}), ...(patch.content !== undefined ? { content: patch.content || null } : {}), ...(patch.imageUrl !== undefined ? { cover_image_url: patch.imageUrl || null } : {}), ...(patch.status !== undefined ? { status: patch.status, published_at: patch.status === "published" ? new Date().toISOString() : null } : {}), ...(patch.seoTitle !== undefined ? { seo_title: patch.seoTitle || null } : {}), ...(patch.seoDescription !== undefined ? { seo_description: patch.seoDescription || null } : {}) } : { ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.slug !== undefined ? { slug: patch.slug } : {}), ...(patch.summary !== undefined ? { summary: patch.summary || null } : {}), ...(patch.content !== undefined ? { content: patch.content || null } : {}), ...(patch.imageUrl !== undefined ? kind === "industry" ? { image_url: patch.imageUrl || null } : { hero_image_url: patch.imageUrl || null } : {}), ...(patch.icon !== undefined && kind === "service" ? { icon: patch.icon || null } : {}), ...(patch.status !== undefined ? { status: patch.status } : {}), ...(patch.seoTitle !== undefined ? { seo_title: patch.seoTitle || null } : {}), ...(patch.seoDescription !== undefined ? { seo_description: patch.seoDescription || null } : {}) };
  const { data, error } = await client.from(tableFor(kind) as "articles").update(update as never).eq("id", id).select("*").maybeSingle();
  if (error) throw new Error("Could not update the editorial record.");
  return data ? toEditorial(kind, data as Record<string, unknown>) : null;
}
export async function permanentlyDeleteAdminEditorial(kind: EditorialKind, id: string): Promise<boolean> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const index = store()[kind].findIndex((item) => item.id === id && item.status === "archived"); if (index < 0) return false; store()[kind].splice(index, 1); return true; }
  if (mode === "unconfigured") throw new Error("Editorial storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from(tableFor(kind) as "articles").delete().eq("id", id).eq("status", "archived").select("id");
  if (error) throw new Error("Could not permanently delete the archived editorial record.");
  return Boolean(data?.length);
}
