import { z } from "zod";

const units = ["roll", "square_metre", "box", "running_metre", "carton", "unit", "drum"] as const;
const optionalDate = z.string().date().or(z.literal("")).optional().default("");

export const adminRateCardCreateSchema = z.object({
  productSlug: z.string().trim().min(1).max(160),
  materialClass: z.string().trim().min(1).max(100),
  thickness: z.string().trim().min(1).max(160),
  sizeLabel: z.string().trim().min(1).max(300),
  lamination: z.string().trim().min(1).max(120),
  orderUnit: z.enum(units),
  rate: z.coerce.number().finite().min(0),
  rateUnit: z.string().trim().min(1).max(100),
  rollAreaM2: z.coerce.number().finite().positive().optional(),
  packRunningMetres: z.coerce.number().finite().positive().optional(),
  packingLabel: z.string().trim().max(240).optional().default(""),
  moq: z.coerce.number().finite().positive().optional(),
  gstRate: z.coerce.number().finite().min(0).max(100).default(18),
  active: z.boolean().default(true),
  validFrom: optionalDate,
  validTo: optionalDate,
  reason: z.string().trim().max(1000).optional().default(""),
}).refine((value) => !value.validFrom || !value.validTo || value.validTo >= value.validFrom, { message: "The valid-to date must be after the valid-from date.", path: ["validTo"] });

const ratePatchBase = z.object({
  rate: z.coerce.number().finite().min(0).optional(), gstRate: z.coerce.number().finite().min(0).max(100).optional(), active: z.boolean().optional(), validFrom: z.string().date().or(z.literal("")).optional(), validTo: z.string().date().or(z.literal("")).optional(), reason: z.string().trim().max(1000).optional(), packingLabel: z.string().trim().max(240).optional(), moq: z.coerce.number().finite().positive().optional(), rollAreaM2: z.coerce.number().finite().positive().optional(), packRunningMetres: z.coerce.number().finite().positive().optional(), archivedAt: z.string().datetime().or(z.literal("")).optional(),
});
export const adminRateCardPatchSchema = ratePatchBase.refine((value) => !value.validFrom || !value.validTo || value.validTo >= value.validFrom, { message: "The valid-to date must be after the valid-from date.", path: ["validTo"] });
