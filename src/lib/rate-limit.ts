import { createHash } from "node:crypto";

import { getRateLimitSalt } from "@/lib/supabase/env";

type RateLimitWindow = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, RateLimitWindow>();

export function getClientFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const firstForwarded = forwarded.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() ?? "";
  const source = firstForwarded || realIp || "unknown";

  const hashInput = `${source}:${userAgent}:${getRateLimitSalt()}`;
  return createHash("sha256").update(hashInput).digest("hex").slice(0, 24);
}

export function evaluateRateLimit(input: {
  namespace: string;
  key: string;
  max: number;
  windowMs: number;
}) {
  const now = Date.now();
  const compositeKey = `${input.namespace}:${input.key}`;
  const existing = windows.get(compositeKey);

  if (!existing || now >= existing.resetAt) {
    windows.set(compositeKey, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.max - 1,
      resetAt: now + input.windowMs,
    };
  }

  if (existing.count >= input.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  windows.set(compositeKey, existing);

  return {
    allowed: true,
    remaining: Math.max(input.max - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function getRetryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

export function clearRateLimitStateForTests() {
  windows.clear();
}
