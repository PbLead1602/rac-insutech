import { z } from "zod";
const base = z.object({ contentKey: z.string().trim().min(2).max(180).regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, dashes or underscores."), title: z.string().trim().max(220).optional().default(""), body: z.record(z.string(), z.unknown()), status: z.enum(["draft", "published", "archived"]), seoTitle: z.string().trim().max(180).optional().default(""), seoDescription: z.string().trim().max(320).optional().default("") });
export const adminSiteContentCreateSchema = base;
export const adminSiteContentPatchSchema = base.partial();
