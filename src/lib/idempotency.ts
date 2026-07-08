import { createHash } from "node:crypto";

import { hasUpstashRedisConfig } from "@/lib/supabase/env";
import { runUpstashCommand } from "@/lib/upstash";

type CompletedSnapshot = {
  phase: "done";
  status: number;
  body: unknown;
  updatedAt: string;
};

type PendingSnapshot = {
  phase: "pending";
  updatedAt: string;
};

type IdempotencySnapshot = CompletedSnapshot | PendingSnapshot;

type LocalRecord = {
  expiresAt: number;
  snapshot: IdempotencySnapshot;
};

const localRecords = new Map<string, LocalRecord>();

function buildStorageKey(namespace: string, actorId: string, key: string) {
  return `idem:${namespace}:${actorId}:${key}`;
}

function digestFallback(raw: string) {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function safeParseSnapshot(raw: string | null): IdempotencySnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as IdempotencySnapshot;
    if (parsed?.phase === "pending") {
      return parsed;
    }

    if (parsed?.phase === "done" && typeof parsed.status === "number") {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

async function readSnapshotDistributed(storageKey: string) {
  const raw = await runUpstashCommand(["GET", storageKey]);
  if (raw === null) {
    return null;
  }

  return safeParseSnapshot(String(raw));
}

function readSnapshotLocal(storageKey: string) {
  const record = localRecords.get(storageKey);
  if (!record) {
    return null;
  }

  if (Date.now() >= record.expiresAt) {
    localRecords.delete(storageKey);
    return null;
  }

  return record.snapshot;
}

async function writeSnapshotDistributed(storageKey: string, snapshot: IdempotencySnapshot, ttlMs: number) {
  const result = await runUpstashCommand(["SET", storageKey, JSON.stringify(snapshot), "PX", ttlMs, "XX"]);
  if (result === null) {
    return false;
  }

  return true;
}

function writeSnapshotLocal(storageKey: string, snapshot: IdempotencySnapshot, ttlMs: number) {
  localRecords.set(storageKey, {
    expiresAt: Date.now() + ttlMs,
    snapshot,
  });
}

export async function beginIdempotentOperation(input: {
  namespace: string;
  actorId: string;
  request: Request;
  fallbackSeed: string;
  ttlMs?: number;
}) {
  const ttlMs = input.ttlMs ?? 5 * 60 * 1000;
  const explicit = input.request.headers.get("idempotency-key")?.trim();
  const operationKey = explicit || digestFallback(input.fallbackSeed);
  const storageKey = buildStorageKey(input.namespace, input.actorId, operationKey);
  const nowIso = new Date().toISOString();
  const pending: PendingSnapshot = {
    phase: "pending",
    updatedAt: nowIso,
  };

  if (hasUpstashRedisConfig()) {
    const distributedSet = await runUpstashCommand(["SET", storageKey, JSON.stringify(pending), "PX", ttlMs, "NX"]).catch(() => null);
    if (distributedSet === "OK") {
      return {
        mode: "proceed" as const,
        storageKey,
        ttlMs,
        idempotencyKey: operationKey,
      };
    }

    const snapshot = await readSnapshotDistributed(storageKey);
    if (snapshot?.phase === "done") {
      return {
        mode: "replay" as const,
        status: snapshot.status,
        body: snapshot.body,
        idempotencyKey: operationKey,
      };
    }

    return {
      mode: "inflight" as const,
      idempotencyKey: operationKey,
    };
  }

  if (!localRecords.has(storageKey) || readSnapshotLocal(storageKey) === null) {
    writeSnapshotLocal(storageKey, pending, ttlMs);
    return {
      mode: "proceed" as const,
      storageKey,
      ttlMs,
      idempotencyKey: operationKey,
    };
  }

  const snapshot = readSnapshotLocal(storageKey);
  if (snapshot?.phase === "done") {
    return {
      mode: "replay" as const,
      status: snapshot.status,
      body: snapshot.body,
      idempotencyKey: operationKey,
    };
  }

  return {
    mode: "inflight" as const,
    idempotencyKey: operationKey,
  };
}

export async function finalizeIdempotentOperation(input: {
  storageKey: string;
  ttlMs: number;
  status: number;
  body: unknown;
}) {
  const snapshot: CompletedSnapshot = {
    phase: "done",
    status: input.status,
    body: input.body,
    updatedAt: new Date().toISOString(),
  };

  const writtenDistributed = hasUpstashRedisConfig()
    ? await writeSnapshotDistributed(input.storageKey, snapshot, input.ttlMs).catch(() => false)
    : false;
  if (!writtenDistributed) {
    writeSnapshotLocal(input.storageKey, snapshot, input.ttlMs);
  }
}

export function clearIdempotencyStateForTests() {
  localRecords.clear();
}
