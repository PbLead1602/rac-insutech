import "server-only";

import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { CustomerAccount, EnquiryRecord, QuotationRecord } from "@/lib/db/types";

export type EmailDispatchResult = { delivered: boolean; mode: IntegrationMode; error?: string };

const escaped = (value: string | undefined) =>
  (value || "Not provided").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);

function enquiryEmail(enquiry: EnquiryRecord) {
  const values = [
    ["Contact", enquiry.name], ["Company", enquiry.company], ["Mobile", enquiry.mobile], ["Email", enquiry.email],
    ["Product", enquiry.product], ["Application", enquiry.application], ["Quantity", enquiry.quantity], ["Project location", enquiry.projectLocation],
  ];
  return `<h2>New RAC Insutech RFQ</h2><p>A website enquiry needs review.</p><table>${values.map(([label, value]) => `<tr><td style="padding:6px 14px 6px 0;color:#64748b">${label}</td><td style="padding:6px 0"><strong>${escaped(value)}</strong></td></tr>`).join("")}</table><p><strong>Requirement:</strong><br>${escaped(enquiry.message)}</p>`;
}

async function sendBrevoEmail(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": serverEnv.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      // Never log the request body: it contains customer details. The status is
      // sufficient for production diagnosis and cannot expose credentials.
      console.error("Brevo transactional email was rejected", { status: response.status });
    }
    return { ok: response.ok };
  } catch (error) {
    // An email provider outage or network interruption must never roll back or
    // falsely report failure for an enquiry, approval, or issued quotation.
    console.error("Brevo transactional email request failed", {
      message: error instanceof Error ? error.message : "Unknown request error",
    });
    return { ok: false };
  }
}

export async function sendRfqNotifications(enquiry: EnquiryRecord): Promise<EmailDispatchResult> {
  const mode = integrationMode(serverEnv.brevoConfigured);
  if (mode === "mock") {
    console.info(`[RFQ mock email] New RFQ ${enquiry.id} would be sent to sales.`);
    return { delivered: false, mode };
  }
  if (mode === "unconfigured") return { delivered: false, mode, error: "Brevo is not configured." };

  const sender = { email: serverEnv.BREVO_SENDER_EMAIL, name: serverEnv.BREVO_SENDER_NAME || "RAC Insutech" };
  const salesResponse = await sendBrevoEmail({
    sender,
    to: [{ email: serverEnv.RFQ_RECIPIENT_EMAIL }],
    subject: `New RFQ from ${enquiry.name}${enquiry.product ? ` — ${enquiry.product}` : ""}`,
    htmlContent: enquiryEmail(enquiry),
  });
  if (!salesResponse.ok) return { delivered: false, mode, error: "Brevo rejected the sales notification." };

  if (enquiry.email) {
    const customerResponse = await sendBrevoEmail({
      sender,
      to: [{ email: enquiry.email, name: enquiry.name }],
      subject: "We received your RAC Insutech quote request",
      htmlContent: `<h2>Thank you, ${escaped(enquiry.name)}.</h2><p>Your RAC Insutech quote request has been received. Our technical team will review the details and respond shortly.</p>${enquiry.product ? `<p><strong>Requirement:</strong> ${escaped(enquiry.product)}</p>` : ""}<p>RAC Insutech</p>`,
    });
    if (!customerResponse.ok) return { delivered: false, mode, error: "The sales alert was sent, but customer confirmation failed." };
  }
  return { delivered: true, mode };
}

/** Approval notification is intentionally separate from email verification. */
export async function sendCustomerAccountApprovalNotification(account: CustomerAccount): Promise<EmailDispatchResult> {
  const mode = integrationMode(serverEnv.brevoConfigured);
  if (mode === "mock") { console.info(`[Customer account mock email] Approval notice would be sent to ${account.email}.`); return { delivered: false, mode }; }
  if (mode === "unconfigured") return { delivered: false, mode, error: "Brevo is not configured." };
  const sender = { email: serverEnv.BREVO_SENDER_EMAIL, name: serverEnv.BREVO_SENDER_NAME || "RAC Insutech" };
  const siteUrl = serverEnv.siteUrl.replace(/\/$/, "");
  const response = await sendBrevoEmail({
    sender,
    to: [{ email: account.email, name: account.fullName }],
    subject: "Your RAC Insutech account has been approved",
    htmlContent: `<h2>Your RAC Insutech account has been approved.</h2><p>Hello ${escaped(account.fullName)},</p><p>RAC has verified your customer account. You can now configure valid products, generate commercial quotations and access your quotation history.</p><p><a href="${siteUrl}/account/sign-in">Sign in and generate a quotation</a></p><p>RAC Insutech</p>`,
  });
  return response.ok ? { delivered: true, mode } : { delivered: false, mode, error: "Brevo rejected the account approval email." };
}

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function quotationEmail(quotation: QuotationRecord, quoteUrl: string) {
  const rows = quotation.items.map((item) => `<tr><td style="padding:7px 12px 7px 0">${escaped(item.productName)}</td><td style="padding:7px 12px 7px 0">${escaped(item.configuration)}</td><td style="padding:7px 12px 7px 0">${escaped(item.technicalQuantity)}</td><td style="padding:7px 0;text-align:right"><strong>${money(item.amount)}</strong></td></tr>`).join("");
  return `<h2>RAC Insutech quotation ${escaped(quotation.quoteNumber)}</h2><p>Prepared for <strong>${escaped(quotation.customer.company)}</strong>.</p><table style="border-collapse:collapse;width:100%"><thead><tr><th align="left">Product</th><th align="left">Configuration</th><th align="left">Supply quantity</th><th align="right">Amount</th></tr></thead><tbody>${rows}</tbody></table><p>Subtotal: <strong>${money(quotation.subtotal)}</strong><br>GST (${quotation.gstRate}%): <strong>${money(quotation.gstAmount)}</strong><br>Total: <strong>${money(quotation.total)}</strong><br>Transport: <strong>At Actual</strong></p><p>Rates are selection guidance from the configured rate card and must be reviewed by RAC before order acceptance.</p><p><a href="${quoteUrl}">View your quotation securely</a></p>`;
}

export async function sendQuotationNotifications(quotation: QuotationRecord, quoteUrl: string): Promise<EmailDispatchResult> {
  const mode = integrationMode(serverEnv.brevoConfigured);
  if (mode === "mock") {
    console.info(`[Quotation mock email] ${quotation.quoteNumber} would be sent to ${quotation.customer.email} and sales.`);
    return { delivered: false, mode };
  }
  if (mode === "unconfigured") return { delivered: false, mode, error: "Brevo is not configured." };

  const sender = { email: serverEnv.BREVO_SENDER_EMAIL, name: serverEnv.BREVO_SENDER_NAME || "RAC Insutech" };
  const message = quotationEmail(quotation, quoteUrl);
  const salesResponse = await sendBrevoEmail({
    sender,
    to: [{ email: serverEnv.RFQ_RECIPIENT_EMAIL }],
    subject: `Quotation ${quotation.quoteNumber} - ${quotation.customer.company}`,
    htmlContent: message,
  });
  if (!salesResponse.ok) return { delivered: false, mode, error: "Brevo rejected the sales quotation notification." };

  const customerResponse = await sendBrevoEmail({
    sender,
    to: [{ email: quotation.customer.email, name: quotation.customer.fullName }],
    subject: `Your RAC Insutech quotation ${quotation.quoteNumber}`,
    htmlContent: message,
  });
  if (!customerResponse.ok) return { delivered: false, mode, error: "The sales alert was sent, but the customer quotation email failed." };
  return { delivered: true, mode };
}
