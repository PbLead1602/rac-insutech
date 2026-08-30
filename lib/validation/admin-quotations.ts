import { z } from "zod";
import { quotationCustomerSchema } from "@/lib/validation/quotation";

const statuses = ["draft", "generated", "sent", "viewed", "follow_up", "revision_requested", "revised", "accepted", "po_received", "won", "lost", "expired", "cancelled"] as const;

export const adminQuotationPatchSchema = z.object({
  status: z.enum(statuses).optional(),
  followUpAt: z.string().datetime().or(z.literal("")).optional(),
  followUpNote: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  lostReason: z.string().trim().max(500).optional(),
  validUntil: z.string().date().or(z.literal("")).optional(),
});

export const adminQuotationNoteSchema = z.object({ note: z.string().trim().min(1, "Enter an internal note.").max(5000) });

const revisionItemSchema = z.object({
  variantId: z.string().trim().min(1).max(180),
  productName: z.string().trim().min(1, "Enter a product name.").max(200),
  configuration: z.string().trim().min(1, "Enter the product configuration.").max(1000),
  requestedQuantity: z.coerce.number().finite().nonnegative(),
  requestedUnit: z.string().trim().min(1).max(60),
  suppliedQuantity: z.coerce.number().finite().positive("Supply quantity must be greater than zero."),
  suppliedUnit: z.string().trim().min(1).max(60),
  cartons: z.coerce.number().int().positive().optional(),
  technicalQuantity: z.string().trim().min(1, "Enter the supply quantity description.").max(500),
  rate: z.coerce.number().finite().nonnegative(),
  rateUnit: z.string().trim().min(1).max(80),
});

export const adminQuotationRevisionSchema = z.object({
  customer: quotationCustomerSchema,
  items: z.array(revisionItemSchema).min(1, "Keep at least one quotation line."),
  gstRate: z.coerce.number().finite().min(0).max(100),
  validUntil: z.string().date().or(z.literal("")).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  reason: z.string().trim().min(3, "Enter a reason for this revision.").max(1000),
});

export const adminQuotationCreateSchema = z.object({
  customer: quotationCustomerSchema,
  items: z.array(revisionItemSchema).min(1, "Keep at least one quotation line."),
  gstRate: z.coerce.number().finite().min(0).max(100),
  enquiryId: z.string().uuid().optional(),
  validUntil: z.string().date().or(z.literal("")).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
});
