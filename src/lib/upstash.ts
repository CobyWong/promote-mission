import {
  getUpstashRedisRestToken,
  getUpstashRedisRestUrl,
  hasUpstashRedisConfig,
} from "@/lib/supabase/env";

export async function runUpstashCommand(command: Array<string | number>) {
  if (!hasUpstashRedisConfig()) {
    return null;
  }

  const response = await fetch(`${getUpstashRedisRestUrl()}/`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getUpstashRedisRestToken()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(2000),
  });

  if (!response.ok) {
    throw new Error(`Upstash command failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    result?: unknown;
    error?: string;
  };

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload.result ?? null;
}
