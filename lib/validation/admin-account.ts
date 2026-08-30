import { z } from "zod";

export const adminAccountPatchSchema = z.object({ displayName: z.string().trim().min(2, "Enter an Admin display name.").max(120) });
