import { z } from "zod";
export const editorialKindSchema = z.enum(["application", "industry", "service", "resource"]);
const text = (max: number) => z.string().trim().max(max).optional().default("");
const base = z.object({ name: z.string().trim().min(2).max(220), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes."), summary: text(1200), content: text(16000), imageUrl: text(1000), icon: text(120), status: z.enum(["draft", "published", "archived"]), seoTitle: text(180), seoDescription: text(320) });
export const adminEditorialCreateSchema = base; export const adminEditorialPatchSchema = base.partial();
