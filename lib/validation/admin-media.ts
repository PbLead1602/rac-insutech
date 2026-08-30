import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const path = z.string().trim().min(1, "Enter a public asset path or an https URL.").max(1000).refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), "Use a relative public path or an http(s) URL.");
const optionalNumber = z.union([z.number(), z.string()]).optional().transform((value) => value === "" || value === undefined ? undefined : Number(value)).refine((value) => value === undefined || (Number.isInteger(value) && value >= 0), "Use a non-negative whole number.");
const base = z.object({ fileName: z.string().trim().min(2).max(255), storagePath: path, mimeType: z.string().trim().min(3).max(120), sizeBytes: optionalNumber, width: optionalNumber, height: optionalNumber, altText: optionalText(500), visibility: z.enum(["public", "internal"]) });

export const adminMediaCreateSchema = base;
export const adminMediaPatchSchema = base.partial().extend({ archived: z.boolean().optional() });
