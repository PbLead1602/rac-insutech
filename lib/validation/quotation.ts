import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().default("");

export const quotationItemSchema = z.object({
  variantId: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().finite().positive().max(1000000),
  orderUnit: z.enum(["roll", "square_metre", "box", "running_metre", "carton", "unit", "drum"]),
});

export const quotationCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  company: z.string().trim().min(2, "Please enter your company name.").max(160),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number.").max(30),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  gstin: z.string().trim().max(30).optional().default(""),
  projectName: z.string().trim().max(180).optional().default(""),
  projectLocation: z.string().trim().max(220).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  pinCode: z.string().trim().max(20).optional().default(""),
  customerType: z.enum(["end_user", "contractor", "consultant", "dealer", "other"]).optional(),
  deliveryPreference: z.string().trim().max(180).optional().default(""),
  billingAddress: z.string().trim().max(2000).optional().default(""),
  shippingAddress: z.string().trim().max(2000).optional().default(""),
  notes: optionalText,
});

export const quotationSubmissionSchema = z.object({
  items: z.array(quotationItemSchema).min(1, "Add at least one configured product to the quotation."),
  customer: quotationCustomerSchema,
  enquiryId: z.string().uuid().optional(),
  turnstileToken: z.string().trim().max(4000).optional().default(""),
});

export type QuotationSubmission = z.infer<typeof quotationSubmissionSchema>;
