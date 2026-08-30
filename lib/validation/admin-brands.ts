import { z } from "zod";
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const base = z.object({ name: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes."), description: optionalText(1000), logoUrl: optionalText(1000), websiteUrl: optionalText(1000), authorizationNote: optionalText(1200), status: z.enum(["draft", "published", "archived"]), seoTitle: optionalText(180), seoDescription: optionalText(320) });
export const adminBrandCreateSchema = base; export const adminBrandPatchSchema = base.partial();
