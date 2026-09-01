import "server-only";

import { randomUUID } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { ProjectRecord, ProjectStatus, QuotationCustomer } from "@/lib/db/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type DevelopmentStore = { projects: ProjectRecord[] };
function developmentStore(): DevelopmentStore { return persistentDevelopmentStore("projects", () => ({ projects: [] })); }

export type ProjectInput = Omit<ProjectRecord, "id" | "slug" | "createdAt">;
export type ProjectDetail = { project: ProjectRecord; linked: { enquiries: number; quotations: number } };
export type SaveProjectResult = { project: ProjectRecord; mode: IntegrationMode };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "project"; }
function toProjectRecord(row: Record<string, unknown>): ProjectRecord { return { id: String(row.id), title: String(row.title || ""), slug: String(row.slug || ""), customerId: row.customer_id ? String(row.customer_id) : undefined, clientName: row.client_name ? String(row.client_name) : undefined, location: row.location ? String(row.location) : undefined, requirement: row.requirement ? String(row.requirement) : undefined, solution: row.solution ? String(row.solution) : undefined, scope: row.scope ? String(row.scope) : undefined, internalNotes: row.internal_notes ? String(row.internal_notes) : undefined, projectStatus: row.project_status as ProjectStatus, startDate: row.start_date ? String(row.start_date) : undefined, expectedDeliveryDate: row.expected_delivery_date ? String(row.expected_delivery_date) : undefined, createdAt: String(row.created_at) }; }

export async function listAdminProjects(query = ""): Promise<ProjectRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const search = query.trim().toLowerCase(); return developmentStore().projects.filter((item) => !search || [item.title, item.clientName, item.location, item.requirement].join(" ").toLowerCase().includes(search)); }
  if (mode === "unconfigured") throw new Error("Project storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("projects").select("*").order("created_at", { ascending: false }).limit(100);
  if (query.trim()) request = request.or(`title.ilike.%${query.trim()}%,client_name.ilike.%${query.trim()}%,location.ilike.%${query.trim()}%,requirement.ilike.%${query.trim()}%`);
  const { data, error } = await request; if (error) throw new Error("Could not load projects.");
  return (data || []).map((row) => toProjectRecord(row as Record<string, unknown>));
}

/** Returns every project associated with a selected customer record. */
export async function listAdminProjectsForCustomer(customerId: string): Promise<ProjectRecord[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().projects.filter((item) => item.customerId === customerId);
  if (mode === "unconfigured") throw new Error("Project storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data, error } = await client.from("projects").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Could not load the customer's projects.");
  return (data || []).map((row) => toProjectRecord(row as Record<string, unknown>));
}

export async function createAdminProject(input: ProjectInput): Promise<SaveProjectResult> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (mode === "unconfigured") throw new Error("Project storage is not configured.");
  const baseSlug = slugify(input.title);
  if (mode === "mock") { const slug = `${baseSlug}-${String(developmentStore().projects.filter((project) => project.slug.startsWith(baseSlug)).length + 1).padStart(2, "0")}`; const project: ProjectRecord = { ...input, id: randomUUID(), slug, createdAt: new Date().toISOString() }; developmentStore().projects.unshift(project); return { project, mode }; }
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
  const { data, error } = await client.from("projects").insert({ title: input.title, slug, customer_id: input.customerId || null, client_name: input.clientName || null, location: input.location || null, requirement: input.requirement || null, solution: input.solution || null, scope: input.scope || null, internal_notes: input.internalNotes || null, project_status: input.projectStatus, start_date: input.startDate || null, expected_delivery_date: input.expectedDeliveryDate || null }).select("*").single();
  if (error || !data) throw new Error("Could not create the project."); return { project: toProjectRecord(data as Record<string, unknown>), mode };
}

type QuoteProjectOptions = { customer: QuotationCustomer; customerId: string; fallbackTitle?: string; force?: boolean };

/** Reuses the customer project when possible and otherwise creates an active sales project. */
export async function findOrCreateProjectForQuotation({ customer, customerId, fallbackTitle, force = false }: QuoteProjectOptions): Promise<SaveProjectResult | null> {
  const hasProjectDetails = Boolean(customer.projectName?.trim() || customer.projectLocation?.trim());
  if (!force && !hasProjectDetails) return null;

  const title = customer.projectName?.trim() || fallbackTitle || `${customer.company || customer.fullName} supply project`;
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "unconfigured") throw new Error("Project storage is not configured.");

  if (mode === "mock") {
    const existing = developmentStore().projects.find((project) => project.customerId === customerId && project.title.trim().toLowerCase() === title.toLowerCase());
    if (existing) return { project: existing, mode };
  } else {
    const client = getSupabaseServiceClient();
    if (!client) throw new Error("Supabase service client is unavailable.");
    const { data, error } = await client.from("projects").select("*").eq("customer_id", customerId).ilike("title", title).limit(1);
    if (error) throw new Error("Could not check for a matching project.");
    if (data?.[0]) return { project: toProjectRecord(data[0] as Record<string, unknown>), mode };
  }

  return createAdminProject({
    title,
    customerId,
    clientName: customer.company || customer.fullName,
    location: customer.projectLocation || [customer.city, customer.state].filter(Boolean).join(", "),
    requirement: customer.notes || "",
    solution: "",
    scope: "",
    internalNotes: "Created automatically from a RAC quotation.",
    projectStatus: "active",
    startDate: "",
    expectedDeliveryDate: "",
  });
}

export async function getAdminProject(id: string): Promise<ProjectDetail | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const project = developmentStore().projects.find((item) => item.id === id); return project ? { project, linked: { enquiries: 0, quotations: 0 } } : null; }
  if (mode === "unconfigured") throw new Error("Project storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data, error }, enquiries, quotations] = await Promise.all([client.from("projects").select("*").eq("id", id).maybeSingle(), client.from("enquiries").select("id", { count: "exact", head: true }).eq("project_id", id), client.from("quotations").select("id", { count: "exact", head: true }).eq("project_id", id)]);
  if (error || enquiries.error || quotations.error) throw new Error("Could not load the project."); if (!data) return null;
  return { project: toProjectRecord(data as Record<string, unknown>), linked: { enquiries: enquiries.count || 0, quotations: quotations.count || 0 } };
}

export async function updateAdminProject(id: string, patch: Partial<ProjectInput>): Promise<ProjectRecord | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") { const index = developmentStore().projects.findIndex((item) => item.id === id); if (index < 0) return null; const project = { ...developmentStore().projects[index], ...patch }; developmentStore().projects[index] = project; return project; }
  if (mode === "unconfigured") throw new Error("Project storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.customerId !== undefined ? { customer_id: patch.customerId || null } : {}), ...(patch.clientName !== undefined ? { client_name: patch.clientName || null } : {}), ...(patch.location !== undefined ? { location: patch.location || null } : {}), ...(patch.requirement !== undefined ? { requirement: patch.requirement || null } : {}), ...(patch.solution !== undefined ? { solution: patch.solution || null } : {}), ...(patch.scope !== undefined ? { scope: patch.scope || null } : {}), ...(patch.internalNotes !== undefined ? { internal_notes: patch.internalNotes || null } : {}), ...(patch.projectStatus !== undefined ? { project_status: patch.projectStatus } : {}), ...(patch.startDate !== undefined ? { start_date: patch.startDate || null } : {}), ...(patch.expectedDeliveryDate !== undefined ? { expected_delivery_date: patch.expectedDeliveryDate || null } : {}) };
  const { data, error } = await client.from("projects").update(update).eq("id", id).select("*").maybeSingle(); if (error) throw new Error("Could not update the project."); return data ? toProjectRecord(data as Record<string, unknown>) : null;
}
