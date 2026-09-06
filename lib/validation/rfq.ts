import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().default("");

export const rfqSchema = z.object({
  submissionId: z.union([z.literal(""), z.string().uuid()]).optional().default(""),
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  company: z.string().trim().max(160).optional().default(""),
  mobile: z.string().trim().min(7, "Please enter a valid mobile number.").max(30),
  email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email address.")]).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  pinCode: z.string().trim().max(20).optional().default(""),
  projectLocation: z.string().trim().max(180).optional().default(""),
  projectName: z.string().trim().max(180).optional().default(""),
  product: z.string().trim().max(180).optional().default(""),
  brand: z.string().trim().max(120).optional().default(""),
  quantity: z.string().trim().max(80).optional().default(""),
  thickness: z.string().trim().max(80).optional().default(""),
  application: z.string().trim().max(180).optional().default(""),
  customerType: z.enum(["end_user", "contractor", "consultant", "dealer", "other"]).optional().default("end_user"),
  deliveryPreference: z.string().trim().max(180).optional().default(""),
  message: optionalText,
});

export type RfqPayload = z.infer<typeof rfqSchema>;
