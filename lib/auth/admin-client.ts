"use client";

import type { AdminProfile, UserRole } from "@/lib/db/types";
import { env } from "@/lib/env";
import { getAdminSupabaseBrowserClient } from "@/lib/supabase/client";
import { previewEntries, type AdminMutationPreview } from "@/components/admin-change-confirmation-guard";

const mockSessionKey = "rac-dev-admin-session";
const adminRole: UserRole = "admin";

export type AdminSession = { profile: AdminProfile; isMock: boolean; accessToken?: string };

function readMockSession(): AdminSession | null {
  if (typeof window === "undefined" || !env.devMocksEnabled) return null;
  try {
    const stored = window.sessionStorage.getItem(mockSessionKey);
    if (!stored) return null;
    const value = JSON.parse(stored) as { profile?: AdminProfile; accessToken?: string };
    if (!value.profile || !value.accessToken) return null;
    return { profile: { ...value.profile, role: adminRole, isPrimaryAdmin: true }, isMock: true, accessToken: value.accessToken };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const client = getAdminSupabaseBrowserClient();
  if (!client) return readMockSession();

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, email, display_name, role, is_primary_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !profile || profile.role !== adminRole || !profile.is_primary_admin) return null;
  return {
    isMock: false,
    profile: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name || profile.email,
      role: adminRole,
      isPrimaryAdmin: true,
    },
  };
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Enter your email and password.");
  const client = getAdminSupabaseBrowserClient();

  if (!client) {
    if (!env.devMocksEnabled) throw new Error("Supabase authentication has not been configured.");
    const response = await fetch("/api/admin-auth/sign-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalizedEmail, password }) });
    const data = await response.json() as { ok?: boolean; message?: string; profile?: AdminProfile; accessToken?: string };
    if (!response.ok || !data.profile || !data.accessToken) throw new Error(data.message || "Could not sign in as RAC Admin.");
    const session: AdminSession = { profile: { ...data.profile, role: adminRole, isPrimaryAdmin: true }, isMock: true, accessToken: data.accessToken };
    window.sessionStorage.setItem(mockSessionKey, JSON.stringify({ profile: session.profile, accessToken: session.accessToken }));
    return session;
  }

  const { data, error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error || !data.user) throw new Error(error?.message || "Could not sign in.");
  const session = await getAdminSession();
  if (!session) {
    await client.auth.signOut();
    throw new Error("This account is not the authorised RAC Admin account.");
  }
  return session;
}

export async function signOutAdmin() {
  const client = getAdminSupabaseBrowserClient();
  if (client) await client.auth.signOut();
  if (typeof window !== "undefined") window.sessionStorage.removeItem(mockSessionKey);
}

/** Sends the Supabase access token only to protected Admin API routes. */
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
  const requiresConfirmation = typeof window !== "undefined" && ["PATCH", "PUT", "DELETE"].includes(method) && url.startsWith("/api/admin/");
  if (requiresConfirmation) {
    let values: AdminMutationPreview["values"] = [];
    if (typeof init.body === "string") {
      try { values = previewEntries(JSON.parse(init.body) as unknown); } catch { values = [{ label: "Submitted change", value: "The submitted update could not be previewed as structured data." }]; }
    }
    const approved = await (window.__racConfirmAdminMutation?.({ method: method as AdminMutationPreview["method"], url, values }) ?? Promise.resolve(window.confirm(method === "DELETE" ? "Are you sure you want to permanently delete this record?" : "Review and confirm this change?")));
    if (!approved) return new Response(JSON.stringify({ ok: false, message: "Change cancelled. No data was modified." }), { status: 409, headers: { "Content-Type": "application/json" } });
  }
  const client = getAdminSupabaseBrowserClient();
  const headers = new Headers(init.headers);
  if (client) {
    const { data: { session } } = await client.auth.getSession();
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  } else {
    const session = readMockSession();
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  return fetch(input, { ...init, headers });
}
