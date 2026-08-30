import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const fileUrl = z.string().trim().min(1, "Enter the document URL or file path.").max(1000).refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "Use a relative file path or an http(s) URL.");
const base = z.object({ title: z.string().trim().min(2).max(220), documentType: z.enum(["datasheet", "brochure", "test_certificate", "installation_guide", "other"]), productId: optionalText(160), materialFamily: optionalText(160), version: optionalText(80), documentDate: z.string().trim().max(30).optional().default(""), fileUrl, visibility: z.enum(["public", "internal"]), status: z.enum(["current", "archived"]), replacedById: optionalText(160) });
export const adminDocumentCreateSchema = base;
export const adminDocumentPatchSchema = base.partial();
