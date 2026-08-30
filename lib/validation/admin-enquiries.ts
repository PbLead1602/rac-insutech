import { z } from "zod";
import { rfqSchema } from "@/lib/validation/rfq";

const statuses = ["new", "contacted", "qualified", "quoted", "won", "lost", "spam", "requirement_received", "quotation_required", "quotation_sent", "follow_up", "converted", "not_relevant", "closed"] as const;

export const adminEnquiryPatchSchema = z.object({
  status: z.enum(statuses).optional(),
  followUpAt: z.string().datetime().or(z.literal("")).optional(),
  followUpNote: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(5000).optional(),
  lostReason: z.string().trim().max(500).optional(),
  customerId: z.string().uuid().or(z.literal("")).optional(),
  projectId: z.string().uuid().or(z.literal("")).optional(),
});

export const adminEnquiryNoteSchema = z.object({ note: z.string().trim().min(1, "Enter an internal note.").max(5000) });

export const adminEnquiryCreateSchema = rfqSchema.omit({ turnstileToken: true });
