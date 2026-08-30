import "server-only";

import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export type TurnstileResult = {
  ok: boolean;
  mode: IntegrationMode;
  reason?: string;
};

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const mode = integrationMode(serverEnv.turnstileConfigured);
  if (mode === "mock") return { ok: true, mode, reason: "Development mock verification" };
  if (mode === "unconfigured") return { ok: false, mode, reason: "Spam protection is not configured." };
  if (!token) return { ok: false, mode, reason: "Please complete the spam-protection check." };

  const body = new URLSearchParams({ secret: serverEnv.TURNSTILE_SECRET_KEY, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const result = (await response.json()) as { success?: boolean; [key: string]: unknown };
    return result.success
      ? { ok: true, mode }
      : { ok: false, mode, reason: "Spam-protection verification failed. Please try again." };
  } catch {
    return { ok: false, mode, reason: "Spam-protection service is currently unavailable." };
  }
}
