import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { CustomerAccount, CustomerAccountStatus, CustomerRecord, EnquiryRecord, QuotationRecord } from "@/lib/db/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getAdminEnquiry, linkEnquiryToAccount, updateAdminEnquiry } from "@/lib/repositories/enquiries";
import { findOrCreateCustomerForQuotation, getAdminCustomer, updateAdminCustomer } from "@/lib/repositories/customers";
import { customerPortalSnapshot } from "@/lib/repositories/customer-portal";
import { persistentDevelopmentStore } from "@/lib/development/persistent-store";

type Continuation = { tokenHash: string; enquiryId: string; accountId?: string; expiresAt: string; consumedAt?: string };
type DevelopmentStore = { accounts: CustomerAccount[]; continuations: Continuation[]; passwordHashes: Record<string, string> };

function developmentStore(): DevelopmentStore {
  const store = persistentDevelopmentStore<DevelopmentStore>("customer-accounts", () => ({ accounts: [], continuations: [], passwordHashes: {} }));
  if (!store.passwordHashes) store.passwordHashes = {};
  return store;
}

const accountStatuses: CustomerAccountStatus[] = ["pending_email_verification", "pending_admin_approval", "active", "rejected", "suspended", "archived"];
const accountTypeValues = ["end_user", "contractor", "consultant", "dealer", "other"] as const;
export type CustomerAccountInput = { fullName: string; companyName?: string; email: string; mobile: string; gstin?: string; customerType: typeof accountTypeValues[number] };
export type CustomerProfileInput = { fullName: string; mobile: string; billingAddress?: string; shippingAddress?: string; city?: string; district?: string; state?: string; pinCode?: string };
export type CustomerAccountContext = { account: CustomerAccount; customer?: CustomerRecord; mode: IntegrationMode };
export type CustomerPortalData = { account: CustomerAccount; customer?: CustomerRecord; enquiries: EnquiryRecord[]; quotations: QuotationRecord[]; projects: import("@/lib/db/types").ProjectRecord[]; documents: import("@/lib/db/types").DocumentRecord[]; revisionRequests: import("@/lib/db/types").CustomerRevisionRequest[] };

function normalise(value?: string) { return value?.trim().toLowerCase() || ""; }
function normalisePhone(value?: string) { return value?.replace(/\D/g, "") || ""; }
function hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
function hashPassword(value: string) { return createHash("sha256").update(`rac-development-password:${value}`).digest("hex"); }
function passwordsMatch(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function isActiveStatus(status: string): status is CustomerAccountStatus { return accountStatuses.includes(status as CustomerAccountStatus); }
function toAccount(row: Record<string, unknown>): CustomerAccount {
  const status = String(row.approval_status || "pending_email_verification");
  return {
    id: String(row.id), authUserId: String(row.auth_user_id), email: String(row.email || ""), mobile: String(row.mobile || ""), fullName: String(row.full_name || ""), companyName: row.company_name ? String(row.company_name) : undefined, gstin: row.gstin ? String(row.gstin) : undefined,
    customerType: accountTypeValues.includes(row.customer_type as typeof accountTypeValues[number]) ? row.customer_type as typeof accountTypeValues[number] : "end_user",
    status: isActiveStatus(status) ? status : "pending_email_verification", emailVerified: Boolean(row.email_verified), customerId: row.customer_id ? String(row.customer_id) : undefined, pendingEnquiryId: row.pending_enquiry_id ? String(row.pending_enquiry_id) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined, approvedBy: row.approved_by ? String(row.approved_by) : undefined, rejectedAt: row.rejected_at ? String(row.rejected_at) : undefined, rejectedReason: row.rejected_reason ? String(row.rejected_reason) : undefined, suspendedAt: row.suspended_at ? String(row.suspended_at) : undefined, suspendedReason: row.suspended_reason ? String(row.suspended_reason) : undefined, lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function toCustomer(row: Record<string, unknown>): CustomerRecord {
  return { id: String(row.id), accountId: row.account_id ? String(row.account_id) : undefined, fullName: String(row.full_name || ""), company: row.company ? String(row.company) : undefined, phone: row.phone ? String(row.phone) : undefined, email: row.email ? String(row.email) : undefined, gstin: row.gstin ? String(row.gstin) : undefined, billingAddress: row.billing_address ? String(row.billing_address) : undefined, shippingAddress: row.shipping_address ? String(row.shipping_address) : undefined, city: row.city ? String(row.city) : undefined, district: row.district ? String(row.district) : undefined, state: row.state ? String(row.state) : undefined, pinCode: row.pin_code ? String(row.pin_code) : undefined, customerType: String(row.customer_type || "other") as CustomerRecord["customerType"], notes: row.notes ? String(row.notes) : undefined, status: String(row.status || "active") as CustomerRecord["status"], createdAt: String(row.created_at) };
}

function accountToQuoteCustomer(account: CustomerAccount) {
  return { fullName: account.fullName, company: account.companyName || account.fullName, mobile: account.mobile, email: account.email, gstin: account.gstin || "", customerType: account.customerType };
}
function customerTypeForProfile(type: CustomerAccount["customerType"]): CustomerRecord["customerType"] { return type === "contractor" ? "hvac_contractor" : type === "consultant" || type === "dealer" || type === "end_user" ? type : "other"; }

export async function createEnquiryContinuation(enquiryId: string): Promise<{ token: string; expiresAt: string; mode: IntegrationMode }> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const continuation = { tokenHash: hashToken(token), enquiryId, expiresAt };
  if (mode === "mock") { developmentStore().continuations.unshift(continuation); return { token, expiresAt, mode }; }
  if (mode === "unconfigured") throw new Error("Account registration storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { error } = await client.from("enquiry_continuations").insert({ enquiry_id: enquiryId, token_hash: continuation.tokenHash, expires_at: expiresAt });
  if (error) throw new Error("Could not prepare the secure quotation continuation.");
  return { token, expiresAt, mode };
}

export async function registerDevelopmentCustomer(input: CustomerAccountInput & { password: string }): Promise<CustomerAccount> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode !== "mock") throw new Error("Customer registration is handled by Supabase Authentication in production.");
  const store = developmentStore(); const email = normalise(input.email); const mobile = input.mobile.trim();
  const existing = store.accounts.find((account) => normalise(account.email) === email || (mobile && account.mobile === mobile));
  if (existing) throw new Error("An account already exists for this email or mobile number. Please sign in.");
  const now = new Date().toISOString();
  const account: CustomerAccount = { id: randomUUID(), authUserId: `dev-auth-${randomUUID()}`, email, mobile, fullName: input.fullName.trim(), companyName: input.companyName?.trim() || undefined, gstin: input.gstin?.trim() || undefined, customerType: input.customerType, status: "pending_admin_approval", emailVerified: true, createdAt: now, updatedAt: now };
  store.accounts.unshift(account);
  store.passwordHashes[account.id] = hashPassword(input.password);
  return account;
}

export async function getDevelopmentCustomerAccountByIdentity(identity: string, password: string): Promise<CustomerAccount | null> {
  const value = normalise(identity);
  const store = developmentStore();
  const account = store.accounts.find((item) => normalise(item.email) === value || normalise(item.mobile) === value) || null;
  if (!account || !passwordsMatch(store.passwordHashes[account.id] || "", hashPassword(password))) return null;
  const index = store.accounts.findIndex((item) => item.id === account.id);
  const updated = { ...account, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (index >= 0) store.accounts[index] = updated;
  return updated;
}

export async function getCustomerAccountByAuthUserId(authUserId: string, identity?: { email?: string; emailVerified?: boolean }): Promise<CustomerAccount | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().accounts.find((account) => account.authUserId === authUserId || account.id === authUserId) || null;
  if (mode === "unconfigured") return null;
  const client = getSupabaseServiceClient(); if (!client) return null;
  let { data, error } = await client.from("customer_accounts").select("*").eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw new Error("Could not load the customer account.");
  if (!data && identity?.email) {
    const { data: created, error: createError } = await client.from("customer_accounts").insert({ auth_user_id: authUserId, email: identity.email, email_verified: Boolean(identity.emailVerified), approval_status: identity.emailVerified ? "pending_admin_approval" : "pending_email_verification" }).select("*").single();
    if (createError || !created) throw new Error("Could not prepare the customer account.");
    data = created;
  }
  if (!data) return null;
  const account = toAccount(data as Record<string, unknown>);
  if (identity?.emailVerified && (!account.emailVerified || account.status === "pending_email_verification")) {
    const { data: updated, error: updateError } = await client.from("customer_accounts").update({ email_verified: true, approval_status: account.status === "pending_email_verification" ? "pending_admin_approval" : account.status, last_login_at: new Date().toISOString() }).eq("id", account.id).select("*").single();
    if (updateError || !updated) throw new Error("Could not update account verification.");
    return toAccount(updated as Record<string, unknown>);
  }
  return account;
}

export async function getCustomerContext(authUserId: string, identity?: { email?: string; emailVerified?: boolean }): Promise<CustomerAccountContext | null> {
  const account = await getCustomerAccountByAuthUserId(authUserId, identity); if (!account) return null;
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const customer = account.customerId ? (await getAdminCustomer(account.customerId))?.customer : undefined;
    return { account, customer, mode };
  }
  const client = getSupabaseServiceClient(); if (!client) return null;
  const { data, error } = await client.from("customers").select("*").eq("account_id", account.id).maybeSingle();
  if (error) throw new Error("Could not load the customer profile.");
  return { account, customer: data ? toCustomer(data as Record<string, unknown>) : undefined, mode };
}

export async function attachContinuationToAccount(token: string, account: CustomerAccount): Promise<EnquiryRecord> {
  const tokenHash = hashToken(token); const now = new Date().toISOString(); const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  let enquiryId = "";
  if (mode === "mock") {
    const continuation = developmentStore().continuations.find((item) => item.tokenHash === tokenHash);
    if (!continuation || continuation.expiresAt < now) throw new Error("This quotation continuation has expired. Please submit your enquiry again.");
    if (continuation.accountId && continuation.accountId !== account.id) throw new Error("This quotation continuation belongs to another account.");
    continuation.accountId = account.id; continuation.consumedAt = now; enquiryId = continuation.enquiryId;
    const linked = await linkEnquiryToAccount(enquiryId, account.id); if (!linked) throw new Error("The enquiry could not be linked to this account.");
    const index = developmentStore().accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) developmentStore().accounts[index] = { ...developmentStore().accounts[index], pendingEnquiryId: enquiryId, updatedAt: now };
    if (account.status === "active" && account.customerId) return (await updateAdminEnquiry(enquiryId, { accountId: account.id, customerId: account.customerId, status: "qualified" })) || linked;
    return linked;
  }
  if (mode === "unconfigured") throw new Error("Account registration storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { data: continuation, error } = await client.from("enquiry_continuations").select("id, enquiry_id, account_id, expires_at").eq("token_hash", tokenHash).maybeSingle();
  if (error || !continuation || new Date(String(continuation.expires_at)).getTime() < Date.now()) throw new Error("This quotation continuation has expired. Please submit your enquiry again.");
  if (continuation.account_id && String(continuation.account_id) !== account.id) throw new Error("This quotation continuation belongs to another account.");
  enquiryId = String(continuation.enquiry_id);
  const [{ error: continuationError }, { error: accountError }] = await Promise.all([
    client.from("enquiry_continuations").update({ account_id: account.id, consumed_at: now }).eq("id", continuation.id),
    client.from("customer_accounts").update({ pending_enquiry_id: enquiryId }).eq("id", account.id),
  ]);
  if (continuationError || accountError) throw new Error("Could not attach the enquiry to your account.");
  const linked = await linkEnquiryToAccount(enquiryId, account.id); if (!linked) throw new Error("The enquiry could not be linked to this account.");
  if (account.status === "active" && account.customerId) return (await updateAdminEnquiry(enquiryId, { accountId: account.id, customerId: account.customerId, status: "qualified" })) || linked;
  return linked;
}

/**
 * Proves that a quotation's source enquiry belongs to the active account and
 * repairs an eligible public enquiry before issuing commercial pricing. This
 * removes a timing race between the continuation redirect and the first quote
 * submission without allowing one customer to claim another customer's lead.
 */
export async function ensureEnquiryBelongsToCustomerAccount(enquiryId: string, context: CustomerAccountContext): Promise<EnquiryRecord> {
  if (!context.customer) throw new Error("Your customer profile is not ready yet. Please contact RAC.");
  const detail = await getAdminEnquiry(enquiryId);
  if (!detail) throw new Error("The selected enquiry could not be found.");
  const enquiry = detail.enquiry;
  if (enquiry.accountId && enquiry.accountId !== context.account.id) {
    throw new Error("This enquiry belongs to a different customer account.");
  }
  if (enquiry.customerId && enquiry.customerId !== context.customer.id) {
    throw new Error("This enquiry belongs to a different customer.");
  }

  // An old unlinked enquiry can be restored only when its recorded contact
  // identity matches the authenticated customer. Enquiries created while a
  // customer is already signed in are linked at submission time instead.
  if (!enquiry.accountId && !enquiry.customerId) {
    const emailMatches = Boolean(enquiry.email && normalise(enquiry.email) === normalise(context.account.email));
    const mobileMatches = Boolean(enquiry.mobile && normalisePhone(enquiry.mobile) === normalisePhone(context.account.mobile));
    if (!emailMatches && !mobileMatches) {
      throw new Error("This enquiry is not linked to your customer account. Please start a new enquiry while signed in or contact RAC.");
    }
  }

  if (enquiry.accountId === context.account.id && enquiry.customerId === context.customer.id) return enquiry;
  const linked = await updateAdminEnquiry(enquiryId, {
    accountId: context.account.id,
    customerId: context.customer.id,
  });
  if (!linked) throw new Error("The enquiry could not be linked to your customer account.");
  return linked;
}

export async function listAdminCustomerAccounts(status?: CustomerAccountStatus): Promise<CustomerAccount[]> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") return developmentStore().accounts.filter((account) => !status || account.status === status);
  if (mode === "unconfigured") throw new Error("Customer account storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  let request = client.from("customer_accounts").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) request = request.eq("approval_status", status);
  const { data, error } = await request; if (error) throw new Error("Could not load account approvals.");
  return (data || []).map((row) => toAccount(row as Record<string, unknown>));
}

/** Loads the operational context an Admin needs before approving an account. */
export async function getAdminCustomerAccount(accountId: string): Promise<{ account: CustomerAccount; enquiry?: EnquiryRecord } | null> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  let account: CustomerAccount | null = null;
  if (mode === "mock") account = developmentStore().accounts.find((item) => item.id === accountId) || null;
  else if (mode !== "unconfigured") {
    const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
    const { data, error } = await client.from("customer_accounts").select("*").eq("id", accountId).maybeSingle();
    if (error) throw new Error("Could not load the customer account.");
    account = data ? toAccount(data as Record<string, unknown>) : null;
  }
  if (!account) return null;
  const detail = account.pendingEnquiryId ? await getAdminEnquiry(account.pendingEnquiryId) : null;
  return { account, enquiry: detail?.enquiry };
}

export async function approveCustomerAccount(accountId: string, adminId?: string): Promise<CustomerAccount> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured);
  if (mode === "mock") {
    const index = developmentStore().accounts.findIndex((item) => item.id === accountId); if (index < 0) throw new Error("Customer account was not found.");
    const account = developmentStore().accounts[index]; if (!account.emailVerified || account.status !== "pending_admin_approval") throw new Error("Only verified pending accounts can be approved.");
    const customerResult = await findOrCreateCustomerForQuotation(accountToQuoteCustomer(account));
    await updateAdminCustomer(customerResult.customer.id, { accountId: account.id });
    const now = new Date().toISOString(); const approved = { ...account, status: "active" as const, customerId: customerResult.customer.id, approvedAt: now, approvedBy: adminId, updatedAt: now };
    developmentStore().accounts[index] = approved;
    if (account.pendingEnquiryId) await updateAdminEnquiry(account.pendingEnquiryId, { accountId: account.id, customerId: customerResult.customer.id, status: "qualified" });
    return approved;
  }
  if (mode === "unconfigured") throw new Error("Customer account storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const { error } = await client.rpc("approve_customer_account", { p_account_id: accountId, p_admin_id: adminId || null });
  if (error) throw new Error(error.message || "Could not approve this customer account.");
  const { data, error: accountError } = await client.from("customer_accounts").select("*").eq("id", accountId).single();
  if (accountError || !data) throw new Error("The account was approved but could not be reloaded.");
  return toAccount(data as Record<string, unknown>);
}

export async function updateCustomerAccountStatus(accountId: string, status: Exclude<CustomerAccountStatus, "active">, reason?: string): Promise<CustomerAccount> {
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); if (!accountStatuses.includes(status)) throw new Error("Invalid account status.");
  const now = new Date().toISOString();
  if (mode === "mock") { const index = developmentStore().accounts.findIndex((item) => item.id === accountId); if (index < 0) throw new Error("Customer account was not found."); const existing = developmentStore().accounts[index]; const next = { ...existing, status, ...(status === "rejected" ? { rejectedAt: now, rejectedReason: reason || "" } : {}), ...(status === "suspended" ? { suspendedAt: now, suspendedReason: reason || "" } : {}), updatedAt: now }; developmentStore().accounts[index] = next; return next; }
  if (mode === "unconfigured") throw new Error("Customer account storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const update = { approval_status: status, ...(status === "rejected" ? { rejected_at: now, rejected_reason: reason || null } : {}), ...(status === "suspended" ? { suspended_at: now, suspended_reason: reason || null } : {}) };
  const { data, error } = await client.from("customer_accounts").update(update).eq("id", accountId).select("*").single(); if (error || !data) throw new Error("Could not update account access."); return toAccount(data as Record<string, unknown>);
}

/** Updates the approved account and its one Customer master in one controlled operation. */
export async function updateCustomerProfile(context: CustomerAccountContext, input: CustomerProfileInput): Promise<CustomerAccountContext> {
  if (context.account.status !== "active" || !context.customer) throw new Error("Only approved customers can update their profile.");
  const mode = integrationMode(serverEnv.supabaseServiceConfigured); const now = new Date().toISOString();
  if (mode === "mock") {
    const accountIndex = developmentStore().accounts.findIndex((item) => item.id === context.account.id); if (accountIndex < 0) throw new Error("Customer account was not found.");
    const account = { ...context.account, fullName: input.fullName.trim(), mobile: input.mobile.trim(), updatedAt: now };
    developmentStore().accounts[accountIndex] = account;
    const customer = await updateAdminCustomer(context.customer.id, { fullName: account.fullName, phone: account.mobile, billingAddress: input.billingAddress || "", shippingAddress: input.shippingAddress || "", city: input.city || "", district: input.district || "", state: input.state || "", pinCode: input.pinCode || "" });
    if (!customer) throw new Error("Customer profile was not found.");
    return { account, customer, mode };
  }
  if (mode === "unconfigured") throw new Error("Customer profile storage is not configured.");
  const client = getSupabaseServiceClient(); if (!client) throw new Error("Supabase service client is unavailable.");
  const [{ data: accountRow, error: accountError }, { data: customerRow, error: customerError }] = await Promise.all([
    client.from("customer_accounts").update({ full_name: input.fullName.trim(), mobile: input.mobile.trim() }).eq("id", context.account.id).select("*").single(),
    client.from("customers").update({ full_name: input.fullName.trim(), phone: input.mobile.trim(), billing_address: input.billingAddress || null, shipping_address: input.shippingAddress || null, city: input.city || null, district: input.district || null, state: input.state || null, pin_code: input.pinCode || null }).eq("id", context.customer.id).select("*").single(),
  ]);
  if (accountError || customerError || !accountRow || !customerRow) throw new Error("Could not update your customer profile.");
  return { account: toAccount(accountRow as Record<string, unknown>), customer: toCustomer(customerRow as Record<string, unknown>), mode };
}

export async function portalDataForAccount(context: CustomerAccountContext): Promise<CustomerPortalData> {
  const portal = await customerPortalSnapshot(context);
  return { account: context.account, customer: context.customer, ...portal };
}
