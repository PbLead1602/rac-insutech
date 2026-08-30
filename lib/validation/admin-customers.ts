import { z } from "zod";

const customerTypes = ["hvac_contractor", "consultant", "peb_contractor", "architect", "dealer", "end_user", "industrial_customer", "other"] as const;
const statuses = ["active", "inactive", "archived"] as const;
const optionalText = z.string().trim().max(2000).optional().default("");

const adminCustomerBaseSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the customer contact name.").max(120),
  company: z.string().trim().max(180).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().email("Enter a valid email address.").or(z.literal("")).optional().default(""),
  gstin: z.string().trim().max(30).optional().default(""),
  billingAddress: optionalText,
  shippingAddress: optionalText,
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  pinCode: z.string().trim().max(20).optional().default(""),
  customerType: z.enum(customerTypes).default("other"),
  notes: optionalText,
  status: z.enum(statuses).default("active"),
});

export const adminCustomerCreateSchema = adminCustomerBaseSchema.refine((value) => value.phone || value.email || value.company, { message: "Add a company, phone number or email address.", path: ["company"] });
export const adminCustomerPatchSchema = adminCustomerBaseSchema.partial();
export const adminCustomerNoteSchema = z.object({ note: z.string().trim().min(1, "Enter an internal note.").max(5000) });
