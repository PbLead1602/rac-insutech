import { z } from "zod";

const optionalString = z.string().trim().optional().default("");

// This module is safe to import into Client Components. Keep secret values in
// lib/env/server.ts, which is protected by `server-only`.
const publicEnvironment = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
  NEXT_PUBLIC_SITE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  NEXT_PUBLIC_ENABLE_DEV_MOCKS: optionalString,
  NEXT_PUBLIC_QUOTATION_GST_RATE: optionalString,
}).parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  NEXT_PUBLIC_ENABLE_DEV_MOCKS: process.env.NEXT_PUBLIC_ENABLE_DEV_MOCKS,
  NEXT_PUBLIC_QUOTATION_GST_RATE: process.env.NEXT_PUBLIC_QUOTATION_GST_RATE,
});

export const env = {
  ...publicEnvironment,
  siteUrl: publicEnvironment.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  devMocksEnabled:
    publicEnvironment.NODE_ENV !== "production" &&
    publicEnvironment.NEXT_PUBLIC_ENABLE_DEV_MOCKS !== "false",
  supabasePublicConfigured: Boolean(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL && publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  quotationGstRate: (() => {
    const value = Number(publicEnvironment.NEXT_PUBLIC_QUOTATION_GST_RATE || "18");
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 18;
  })(),
};

export type IntegrationMode = "live" | "mock" | "unconfigured";

export function integrationMode(isConfigured: boolean): IntegrationMode {
  if (isConfigured) return "live";
  if (env.devMocksEnabled) return "mock";
  return "unconfigured";
}
