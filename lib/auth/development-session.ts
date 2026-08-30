import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { AdminProfile } from "@/lib/db/types";

type SessionKind = "admin" | "customer";
type SessionPayload = { kind: SessionKind; subjectId: string; expiresAt: number };

const defaultAdminEmail = "admin@racinsutech.test";
const defaultAdminPassword = "RacAdmin@2026!";
const defaultSessionSecret = "rac-insutech-development-session-secret-change-before-production";

function secret() { return process.env.RAC_DEVELOPMENT_SESSION_SECRET || defaultSessionSecret; }
function safelyEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export function developmentAdminCredentials() {
  return {
    email: (process.env.RAC_DEVELOPMENT_ADMIN_EMAIL || defaultAdminEmail).trim().toLowerCase(),
    password: process.env.RAC_DEVELOPMENT_ADMIN_PASSWORD || defaultAdminPassword,
  };
}

export function developmentAdminProfile(): AdminProfile {
  const { email } = developmentAdminCredentials();
  return { id: "development-admin", email, displayName: "Development Admin", role: "admin", isPrimaryAdmin: true };
}

export function validDevelopmentAdminCredentials(email: string, password: string) {
  const configured = developmentAdminCredentials();
  return safelyEqual(email.trim().toLowerCase(), configured.email) && safelyEqual(password, configured.password);
}

export function createDevelopmentSession(kind: SessionKind, subjectId: string) {
  const payload: SessionPayload = { kind, subjectId, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDevelopmentSession(token: string | null | undefined, kind: SessionKind) {
  if (!token) return null;
  const [encoded, signature, ...extra] = token.split(".");
  if (!encoded || !signature || extra.length || !safelyEqual(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (payload.kind !== kind || typeof payload.subjectId !== "string" || !payload.subjectId || typeof payload.expiresAt !== "number" || payload.expiresAt < Date.now()) return null;
    return { subjectId: payload.subjectId };
  } catch {
    return null;
  }
}
