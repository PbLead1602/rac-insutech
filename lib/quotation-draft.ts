export type QuoteLeadDraft = {
  enquiryId: string;
  enquiryNumber: string;
  continuationToken: string;
  name: string;
  company: string;
  mobile: string;
  email: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  projectLocation: string;
  projectName: string;
  product: string;
  brand: string;
  quantity: string;
  thickness: string;
  application: string;
  customerType: "end_user" | "contractor" | "consultant" | "dealer" | "other";
  deliveryPreference: string;
  message: string;
};

const quoteDraftKey = "rac-insutech:quotation-lead";

export function saveQuoteLeadDraft(draft: QuoteLeadDraft) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(quoteDraftKey, JSON.stringify(draft));
}

export function readQuoteLeadDraft(): QuoteLeadDraft | null {
  if (typeof window === "undefined") return null;
  return parseQuoteLeadDraft(window.sessionStorage.getItem(quoteDraftKey));
}

export function quoteLeadDraftStorageValue() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(quoteDraftKey);
}

export function parseQuoteLeadDraft(value: string | null): QuoteLeadDraft | null {
  try {
    if (!value) return null;
    const draft = JSON.parse(value) as Partial<QuoteLeadDraft>;
    if (!draft.name || !draft.company || !draft.mobile || !draft.email) return null;
    return {
      enquiryId: draft.enquiryId || "",
      enquiryNumber: draft.enquiryNumber || "",
      continuationToken: draft.continuationToken || "",
      name: draft.name,
      company: draft.company,
      mobile: draft.mobile,
      email: draft.email,
      city: draft.city || "",
      district: draft.district || "",
      state: draft.state || "",
      pinCode: draft.pinCode || "",
      projectLocation: draft.projectLocation || "",
      projectName: draft.projectName || "",
      product: draft.product || "",
      brand: draft.brand || "",
      quantity: draft.quantity || "",
      thickness: draft.thickness || "",
      application: draft.application || "",
      customerType: draft.customerType || "end_user",
      deliveryPreference: draft.deliveryPreference || "",
      message: draft.message || "",
    };
  } catch {
    return null;
  }
}

export function clearQuoteLeadDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(quoteDraftKey);
}
