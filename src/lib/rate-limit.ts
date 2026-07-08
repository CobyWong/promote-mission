import { createHash } from "node:crypto";

import { getRateLimitSalt } from "@/lib/supabase/env";
import { runUpstashCommand } from "@/lib/upstash";

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

export async function evaluateRateLimit(input: {
  namespace: string;
  key: string;
  max: number;
  windowMs: number;
}) {
  const distributed = await evaluateDistributedRateLimit(input).catch(() => null);
  if (distributed) {
    return distributed;
  }

  return evaluateLocalRateLimit(input);
}

function evaluateLocalRateLimit(input: {
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

async function evaluateDistributedRateLimit(input: {
  namespace: string;
  key: string;
  max: number;
  windowMs: number;
}) {
  const compositeKey = `rl:${input.namespace}:${input.key}`;
  const countRaw = await runUpstashCommand(["INCR", compositeKey]);
  if (countRaw === null) {
    return null;
  }

  const count = Number(countRaw);
  if (!Number.isFinite(count)) {
    return null;
  }

  if (count === 1) {
    await runUpstashCommand(["PEXPIRE", compositeKey, input.windowMs]);
  }

  const ttlRaw = await runUpstashCommand(["PTTL", compositeKey]);
  const ttl = Number(ttlRaw);
  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : input.windowMs;
  const resetAt = Date.now() + safeTtl;

  if (count > input.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(input.max - count, 0),
    resetAt,
  };
}

export function getRetryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

export function clearRateLimitStateForTests() {
  windows.clear();
}
