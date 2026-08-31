import "server-only";

import { integrationMode, type IntegrationMode } from "@/lib/env";
import { serverEnv } from "@/lib/env/server";

export type TurnstileResult = {
  ok: boolean;
  mode: IntegrationMode;
  reason?: string;
};

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: unknown;
};

function errorCodesFrom(result: SiteverifyResponse): string[] {
  return Array.isArray(result["error-codes"])
    ? result["error-codes"].filter((code): code is string => typeof code === "string")
    : [];
}

function rejectionMessage(errorCodes: string[]): string {
  if (errorCodes.includes("missing-input-response")) return "Please complete the spam-protection check.";
  if (errorCodes.includes("timeout-or-duplicate")) return "The spam-protection check expired. Please complete it again.";
  if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("missing-input-secret")) {
    return "Spam-protection is temporarily unavailable. Please try again shortly or contact RAC.";
  }
  return "Spam-protection verification failed. Please complete the check again.";
}

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
    if (!response.ok) {
      console.warn("Turnstile Siteverify request failed", { status: response.status });
      return { ok: false, mode, reason: "Spam-protection service is currently unavailable." };
    }
    const result = (await response.json()) as SiteverifyResponse;
    if (result.success) return { ok: true, mode };

    const errorCodes = errorCodesFrom(result);
    console.warn("Turnstile Siteverify rejected a token", { errorCodes });
    return { ok: false, mode, reason: rejectionMessage(errorCodes) };
  } catch (error) {
    console.warn("Turnstile Siteverify could not be completed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { ok: false, mode, reason: "Spam-protection service is currently unavailable." };
  }
}
