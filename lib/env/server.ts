import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";

const optionalString = z.string().trim().optional().default("");
const secrets = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  DATABASE_URL: optionalString,
  BREVO_API_KEY: optionalString,
  BREVO_SENDER_EMAIL: optionalString,
  BREVO_SENDER_NAME: optionalString,
  RFQ_RECIPIENT_EMAIL: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
}).parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
  RFQ_RECIPIENT_EMAIL: process.env.RFQ_RECIPIENT_EMAIL,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
});

export const serverEnv = {
  ...env,
  ...secrets,
  supabaseServiceConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && secrets.SUPABASE_SERVICE_ROLE_KEY),
  brevoConfigured: Boolean(secrets.BREVO_API_KEY && secrets.BREVO_SENDER_EMAIL && secrets.RFQ_RECIPIENT_EMAIL),
  turnstileConfigured: Boolean(secrets.TURNSTILE_SECRET_KEY),
};
