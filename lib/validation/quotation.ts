import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().default("");

export const quotationItemSchema = z.object({
  variantId: z.string().trim().min(1).max(160),
  quantity: z.coerce.number().finite().positive().max(1000000),
  orderUnit: z.enum(["roll", "square_metre", "box", "running_metre", "carton", "unit", "drum"]),
});

/** Only geometry and sheet variant IDs cross the network for built-up NBR. */
export const builtUpNbrSelectionSchema = z.object({
  materialClass: z.string().trim().min(1, "Choose a material class.").max(80),
  baseDiameterMm: z.coerce.number().finite().positive("Enter a pipe diameter greater than zero.").max(10000),
  pipeLengthM: z.coerce.number().finite().positive("Enter a pipe length greater than zero.").max(100000),
  requiredTotalThicknessMm: z.coerce.number().finite().positive("Enter the required total insulation thickness.").max(1000),
  layers: z.array(z.object({ variantId: z.string().trim().min(1).max(160) })).min(1, "Add at least one insulation layer.").max(5, "A built-up NBR item can contain up to 5 layers."),
});

export const quotationCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  company: z.string().trim().min(2, "Please enter your company name.").max(160),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number.").max(30),
  email: z.string().trim().email("Please enter a valid email address.").max(180),
  gstin: z.string().trim().max(30).optional().default(""),
  projectName: z.string().trim().min(2, "Enter the project name.").max(180),
  projectLocation: z.string().trim().min(2, "Enter the project location.").max(220),
  city: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  pinCode: z.string().trim().max(20).optional().default(""),
  customerType: z.enum(["end_user", "contractor", "consultant", "dealer", "other"]).optional(),
  deliveryPreference: z.string().trim().max(180).optional().default(""),
  billingAddress: z.string().trim().max(2000).optional().default(""),
  shippingAddress: z.string().trim().max(2000).optional().default(""),
  notes: optionalText,
});

export const quotationSubmissionSchema = z.object({
  items: z.array(quotationItemSchema).max(100).default([]),
  customBuiltUpItems: z.array(builtUpNbrSelectionSchema).max(25).default([]),
  customer: quotationCustomerSchema,
  enquiryId: z.string().uuid().optional(),
  turnstileToken: z.string().trim().max(4000).optional().default(""),
}).refine((value) => value.items.length + value.customBuiltUpItems.length > 0, { message: "Add at least one configured product or Custom Built-Up NBR item to the quotation." });

export type QuotationSubmission = z.infer<typeof quotationSubmissionSchema>;
