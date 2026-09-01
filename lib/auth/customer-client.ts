"use client";

import type { CustomerAccount } from "@/lib/db/types";
import { env } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const mockSessionKey = "rac-dev-customer-session";
export type CustomerBrowserSession = { accountId: string; email: string; isMock: boolean; accessToken?: string };

function readMockSession(): CustomerBrowserSession | null {
  if (typeof window === "undefined" || !env.devMocksEnabled) return null;
  try {
    const value = window.sessionStorage.getItem(mockSessionKey);
    const session = value ? JSON.parse(value) as CustomerBrowserSession : null;
    if (!session?.accessToken) {
      if (value) window.sessionStorage.removeItem(mockSessionKey);
      return null;
    }
    return session;
  } catch { return null; }
}
function saveMockSession(account: CustomerAccount, accessToken: string) {
  const session: CustomerBrowserSession = { accountId: account.id, email: account.email, isMock: true, accessToken };
  window.sessionStorage.setItem(mockSessionKey, JSON.stringify(session)); return session;
}

export async function customerFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const client = getSupabaseBrowserClient(); const headers = new Headers(init.headers);
  if (client) { const { data: { session } } = await client.auth.getSession(); if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`); }
  else { const session = readMockSession(); if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`); }
  return fetch(input, { ...init, headers });
}

export async function signInCustomer(identity: string, password: string): Promise<CustomerBrowserSession | { requiresEmailVerification: true }> {
  const client = getSupabaseBrowserClient();
  if (client) {
    const isEmail = identity.includes("@");
    if (!isEmail) throw new Error("Use the verified email address for sign-in. Mobile OTP sign-in can be enabled when RAC approves an SMS provider.");
    const { data, error } = await client.auth.signInWithPassword(isEmail ? { email: identity.trim(), password } : { phone: identity.trim(), password });
    if (error || !data.user) throw new Error(error?.message || "Could not sign in.");
    return { accountId: data.user.id, email: data.user.email || identity, isMock: false };
  }
  if (password.length < 8) throw new Error("Use an 8-character password in development mode.");
  const response = await fetch("/api/customer-auth/sign-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity, password }) });
  const data = await response.json() as { ok?: boolean; account?: CustomerAccount; accessToken?: string; message?: string };
  if (!response.ok || !data.account || !data.accessToken) throw new Error(data.message || "Could not sign in.");
  return saveMockSession(data.account, data.accessToken);
}

export async function signUpCustomer(input: { fullName: string; companyName?: string; email: string; mobile: string; gstin?: string; customerType: CustomerAccount["customerType"]; password: string; intent?: string }) {
  const client = getSupabaseBrowserClient();
  if (client) {
    const redirect = new URL("/auth/callback", window.location.origin);
    if (input.intent) redirect.searchParams.set("intent", input.intent);
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: redirect.toString(),
        data: { account_type: "customer", full_name: input.fullName, company_name: input.companyName || "", mobile: input.mobile, gstin: input.gstin || "", customer_type: input.customerType },
      },
    });
    if (error || !data.user) throw new Error(error?.message || "Could not create your account.");
    return { requiresEmailVerification: !data.session, accountId: data.user.id };
  }
  const response = await fetch("/api/customer-auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json() as { ok?: boolean; account?: CustomerAccount; accessToken?: string; message?: string };
  if (!response.ok || !data.account || !data.accessToken) throw new Error(data.message || "Could not create your account.");
  saveMockSession(data.account, data.accessToken); return { requiresEmailVerification: false, accountId: data.account.id };
}

/**
 * The email used to register is the customer User ID. Reset responses stay
 * deliberately generic so this screen cannot reveal whether an email belongs
 * to an RAC account.
 */
export async function requestCustomerPasswordReset(email: string, intent?: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Password-reset email is available when Supabase production authentication is configured.");
  const redirect = new URL("/account/reset-password", window.location.origin);
  if (intent) redirect.searchParams.set("intent", intent);
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect.toString() });
  if (error) throw new Error(error.message || "Could not send the password-reset email.");
}

export async function updateCustomerPassword(password: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Password updates are available when Supabase production authentication is configured.");
  if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(error.message || "Could not update your password.");
  await client.auth.signOut();
}

export async function getCustomerSession() {
  const client = getSupabaseBrowserClient();
  if (client) { const { data: { user } } = await client.auth.getUser(); return user ? { accountId: user.id, email: user.email || "", isMock: false } : null; }
  return readMockSession();
}

export async function signOutCustomer() { const client = getSupabaseBrowserClient(); if (client) await client.auth.signOut(); if (typeof window !== "undefined") window.sessionStorage.removeItem(mockSessionKey); }
