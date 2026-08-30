import { z } from "zod";
export const adminSettingSchema = z.object({ key: z.string().trim().min(2).max(120).regex(/^[a-z0-9._-]+$/), value: z.record(z.string(), z.unknown()) });
