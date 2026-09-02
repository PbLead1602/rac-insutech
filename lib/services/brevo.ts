import "server-only";

import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";
import type { CustomerAccount, EnquiryRecord, QuotationRecord } from "@/lib/db/types";
import { createQuotationPdf } from "@/lib/quotations/pdf";

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

function quotationEmail(quotation: QuotationRecord) {
  const projectName = quotation.customer.projectName || "Project to be confirmed";
  const projectLocation = quotation.customer.projectLocation || quotation.customer.city || "To be confirmed";
  const quotationDate = new Date(quotation.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const detailRows = [
    ["Project Name", projectName],
    ["Quotation Number", quotation.quoteNumber],
    ["Quotation Date", quotationDate],
    ["Company Name", quotation.customer.company],
    ["Project Location", projectLocation],
  ].map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#475569">${label}:</td><td style="padding:4px 0"><strong>${escaped(value)}</strong></td></tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#172b4d;line-height:1.6;font-size:15px"><p>Dear Sir/Madam,</p><p>Thank you very much for your valuable enquiry and for considering <strong>RAC Insutech</strong> for your insulation requirement.</p><p>With reference to your requirement for <strong>${escaped(projectName)}</strong>, please find attached our quotation <strong>${escaped(quotation.quoteNumber)}</strong> for your review.</p><p><strong>Quotation details:</strong></p><table style="border-collapse:collapse;margin:0 0 16px">${detailRows}</table><p>The attached PDF contains the selected product details, specifications, quantities, commercial value, applicable GST, and quotation terms.</p><p>Kindly review the quotation and feel free to contact us should you require any clarification, modification, additional quantity, alternative specification, or technical assistance.</p><p>We look forward to the opportunity to support your project and to establishing a long-term business association with your organisation.</p><p>Thank you.</p><p>Regards,<br><strong>RAC Insutech</strong></p><p><strong>Thermal &bull; Acoustic &bull; HVAC Insulation Solutions</strong></p><p>Email: <strong>racinsutech@gmail.com</strong><br>Phone: <strong>+91 91309 58594</strong><br>WhatsApp: <strong>+91 91309 58594</strong><br>Website: <a href="http://www.racinsutech.com">www.racinsutech.com</a><br>Address: <strong>Rukhmini Niwas, Near Vrundavan Garden Apartment, Behind Tulshan Bungalow, Geeta Nagar, Akola</strong></p></div>`;
}

export async function sendQuotationNotifications(quotation: QuotationRecord): Promise<EmailDispatchResult> {
  // A quotation goes only to its customer. It must not depend on the RFQ
  // sales-recipient setting, which is intentionally used only for enquiries.
  const mode = integrationMode(Boolean(serverEnv.BREVO_API_KEY && serverEnv.BREVO_SENDER_EMAIL));
  if (mode === "mock") {
    console.info(`[Quotation mock email] ${quotation.quoteNumber} would be sent to ${quotation.customer.email}.`);
    return { delivered: false, mode };
  }
  if (mode === "unconfigured") return { delivered: false, mode, error: "Brevo is not configured." };

  const sender = { email: serverEnv.BREVO_SENDER_EMAIL, name: serverEnv.BREVO_SENDER_NAME || "RAC Insutech" };
  const pdf = createQuotationPdf(quotation);
  const customerResponse = await sendBrevoEmail({
    sender,
    to: [{ email: quotation.customer.email, name: quotation.customer.fullName }],
    subject: `Quotation ${quotation.quoteNumber} - ${quotation.customer.company}`,
    htmlContent: quotationEmail(quotation),
    attachment: [{ name: `${quotation.quoteNumber}.pdf`, content: pdf.toString("base64") }],
  });
  if (!customerResponse.ok) return { delivered: false, mode, error: "Brevo rejected the customer quotation email." };
  return { delivered: true, mode };
}
