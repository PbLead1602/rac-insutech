import { z } from "zod";

const statuses = ["draft", "published", "archived"] as const;
const base = z.object({ name: z.string().trim().min(2).max(180), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.").max(100), shortDescription: z.string().trim().max(500).optional().default(""), overview: z.string().trim().max(10000).optional().default(""), material: z.string().trim().max(160).optional().default(""), category: z.string().trim().max(160).optional().default(""), family: z.string().trim().max(160).optional().default(""), formFactor: z.string().trim().max(160).optional().default(""), imageUrl: z.string().trim().max(500).optional().default(""), quotationEnabled: z.boolean().default(false), featured: z.boolean().default(false), active: z.boolean().default(true), status: z.enum(statuses).default("draft") });
export const adminProductCreateSchema = base;
export const adminProductPatchSchema = base.partial();
