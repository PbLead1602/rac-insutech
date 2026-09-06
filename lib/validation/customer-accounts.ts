import { z } from "zod";

const customerType = z.enum(["end_user", "contractor", "consultant", "dealer", "other"]);

export const customerRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  companyName: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number.").max(30),
  gstin: z.string().trim().max(30).optional().default(""),
  customerType,
  password: z.string().min(8, "Use a password of at least 8 characters.").max(200),
  intent: z.string().trim().max(500).optional().default(""),
});

export const continuationSchema = z.object({ intent: z.string().trim().min(20, "The quotation continuation is missing or expired.").max(500) });
export const customerAccountActionSchema = z.object({ action: z.enum(["approve", "reject", "suspend", "restore_pending"]), reason: z.string().trim().max(1000).optional().default("") });
export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number.").max(30),
  billingAddress: z.string().trim().max(2000).optional().default(""),
  shippingAddress: z.string().trim().max(2000).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  pinCode: z.string().trim().max(20).optional().default(""),
});
