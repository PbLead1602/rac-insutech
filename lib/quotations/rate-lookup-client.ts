"use client";

/**
 * Shared browser-side contract for the governed Rate Card lookup used by both
 * quotation builders.  Keeping this in one place prevents Admin and customer
 * builders from handling the same transient edge/network failure differently.
 */
export type RateLookupResult = {
  variantId: string;
  available: boolean;
  rate?: number;
  rateUnit?: string;
  message?: string;
};

type RateLookupResponse = {
  ok?: boolean;
  message?: string;
  rates?: RateLookupResult[];
};

type ProtectedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type RateLookupOptions = {
  request: ProtectedFetch;
  endpoint: string;
  variantIds: string[];
  expiredSessionMessage: string;
};

class RateLookupError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

// A failed edge request used to be retried three times by every component
// instance. When a Worker is already at its CPU limit, those overlapping
// retries amplify the outage. Keep one short retry for transient failures and
// make identical in-flight requests share the same network operation.
const attempts = 2;
const requestTimeoutMs = 7_000;
const retryDelaysMs = [500];
const inFlightLookups = new Map<string, Promise<RateLookupResponse & { ok: true; rates: RateLookupResult[] }>>();

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function failureForResponse(response: Response, result: RateLookupResponse | null, expiredSessionMessage: string) {
  if (response.status === 401 || response.status === 403) {
    return new RateLookupError(expiredSessionMessage, false);
  }
  return new RateLookupError(
    result?.message || "Could not load the active Rate Card values.",
    response.status === 429 || response.status >= 500,
  );
}

/**
 * Resolve current approved rates without ever asking a quotation builder to
 * parse an HTML edge error as JSON.  Reads are idempotent, so short retries are
 * safe and improve recovery from an intermittent Worker/Supabase response.
 */
function lookupKey(endpoint: string, variantIds: readonly string[]) {
  return `${endpoint}:${[...new Set(variantIds)].sort().join("|")}`;
}

async function performRateLookup({ request, endpoint, variantIds, expiredSessionMessage }: RateLookupOptions): Promise<RateLookupResponse & { ok: true; rates: RateLookupResult[] }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      const response = await request(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
          "Pragma": "no-cache",
        },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({ variantIds }),
      });
      const body = await response.text();
      let result: RateLookupResponse | null = null;
      try {
        result = JSON.parse(body) as RateLookupResponse;
      } catch {
        if (response.status === 401 || response.status === 403) {
          throw new RateLookupError(expiredSessionMessage, false);
        }
        throw new RateLookupError("The Rate Card service returned an unexpected response. Please try again.", true);
      }

      if (!response.ok || !result.ok || !Array.isArray(result.rates)) {
        throw failureForResponse(response, result, expiredSessionMessage);
      }
      return { ...result, ok: true, rates: result.rates };
    } catch (error) {
      const problem = error instanceof RateLookupError
        ? error
        : new RateLookupError("The Rate Card service could not be reached. Please try again.", true);
      lastError = problem;
      if (!problem.retryable || attempt === attempts - 1) break;
      await wait(retryDelaysMs[attempt] || retryDelaysMs[retryDelaysMs.length - 1]);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Could not load the active Rate Card values.");
}

/**
 * Resolve a governed rate once per exact configuration set. The result is
 * intentionally not cached after completion: a later interaction and final
 * quotation submission still re-read the approved active Rate Card.
 */
export async function fetchApprovedRateLookup(options: RateLookupOptions): Promise<RateLookupResponse & { ok: true; rates: RateLookupResult[] }> {
  const variantIds = [...new Set(options.variantIds)];
  const key = lookupKey(options.endpoint, variantIds);
  const existing = inFlightLookups.get(key);
  if (existing) return existing;

  const lookup = performRateLookup({ ...options, variantIds });
  inFlightLookups.set(key, lookup);
  try {
    return await lookup;
  } finally {
    if (inFlightLookups.get(key) === lookup) inFlightLookups.delete(key);
  }
}
