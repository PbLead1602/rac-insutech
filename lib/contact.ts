export const RAC_WHATSAPP_NUMBER = "919130958594";

/**
 * Explicit contact actions use WhatsApp. Quote actions intentionally remain
 * inside the website so a customer can complete the quotation workflow.
 */
export function whatsappContactHref(context = "a RAC Insutech insulation requirement") {
  const message = `Hello RAC Insutech, I would like to discuss ${context}.`;
  return `https://wa.me/${RAC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
