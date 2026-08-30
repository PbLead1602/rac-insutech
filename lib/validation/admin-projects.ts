import { z } from "zod";

const statuses = ["active", "on_hold", "completed", "archived"] as const;
const text = z.string().trim().max(5000).optional().default("");
const base = z.object({
  title: z.string().trim().min(2, "Enter the project name.").max(180),
  customerId: z.string().uuid().or(z.literal("")).optional().default(""),
  clientName: z.string().trim().max(180).optional().default(""),
  location: z.string().trim().max(220).optional().default(""),
  requirement: text,
  solution: text,
  scope: text,
  internalNotes: text,
  projectStatus: z.enum(statuses).default("active"),
  startDate: z.string().date().or(z.literal("")).optional().default(""),
  expectedDeliveryDate: z.string().date().or(z.literal("")).optional().default(""),
});

export const adminProjectCreateSchema = base;
export const adminProjectPatchSchema = base.partial();
