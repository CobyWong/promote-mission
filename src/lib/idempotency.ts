import { createHash } from "node:crypto";

import { hasUpstashRedisConfig } from "@/lib/supabase/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

type PersistentIdempotencyRow = {
  storage_key: string;
  phase: "pending" | "done";
  response_status: number | null;
  response_body: unknown;
  expires_at: string;
};

const localRecords = new Map<string, LocalRecord>();

function buildStorageKey(namespace: string, actorId: string, key: string) {
  return `idem:${namespace}:${actorId}:${key}`;
}

function toIsoFromTtl(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function hashIdempotencyKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
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
  try {
    const raw = await runUpstashCommand(["GET", storageKey]);
    if (raw === null) {
      return null;
    }

    return safeParseSnapshot(String(raw));
  } catch {
    // Redis should be an optimization; network/config failures must not fail the request path.
    return null;
  }
}

async function readSnapshotPersistent(storageKey: string): Promise<IdempotencySnapshot | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const table = (admin.from("idempotency_keys" as never) as unknown) as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
      };
    };
  };

  const { data, error } = await table
    .select("storage_key, phase, response_status, response_body, expires_at")
    .eq("storage_key", storageKey)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as PersistentIdempotencyRow;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  if (row.phase === "pending") {
    return {
      phase: "pending",
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    phase: "done",
    status: row.response_status ?? 200,
    body: row.response_body,
    updatedAt: new Date().toISOString(),
  };
}

async function claimPersistentPending(input: {
  storageKey: string;
  namespace: string;
  actorId: string;
  idempotencyKey: string;
  ttlMs: number;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return false;
  }

  const table = (admin.from("idempotency_keys" as never) as unknown) as {
    delete: () => {
      eq: (column: string, value: string) => {
        lt: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
    insert: (payload: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>;
  };

  await table
    .delete()
    .eq("storage_key", input.storageKey)
    .lt("expires_at", new Date().toISOString());

  const { error } = await table.insert({
    storage_key: input.storageKey,
    namespace: input.namespace,
    actor_id: input.actorId,
    idempotency_key_hash: hashIdempotencyKey(input.idempotencyKey),
    phase: "pending",
    backend: hasUpstashRedisConfig() ? "redis" : "database",
    expires_at: toIsoFromTtl(input.ttlMs),
  });

  if (error) {
    if (error.code === "23505") {
      return false;
    }
    throw new Error(error.message);
  }

  return true;
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

async function writeSnapshotPersistent(input: {
  storageKey: string;
  ttlMs: number;
  snapshot: IdempotencySnapshot;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return false;
  }

  const table = (admin.from("idempotency_keys" as never) as unknown) as {
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };

  const payload: Record<string, unknown> = {
    phase: input.snapshot.phase,
    updated_at: new Date().toISOString(),
    expires_at: toIsoFromTtl(input.ttlMs),
  };

  if (input.snapshot.phase === "done") {
    payload.response_status = input.snapshot.status;
    payload.response_body = input.snapshot.body;
  }

  const { error } = await table.update(payload).eq("storage_key", input.storageKey);
  if (error) {
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

  const claimedPersistent = await claimPersistentPending({
    storageKey,
    namespace: input.namespace,
    actorId: input.actorId,
    idempotencyKey: operationKey,
    ttlMs,
  }).catch(() => null);

  if (claimedPersistent) {
    return {
      mode: "proceed" as const,
      storageKey,
      ttlMs,
      idempotencyKey: operationKey,
    };
  }

  if (claimedPersistent === false) {
    const persistedSnapshot = await readSnapshotPersistent(storageKey);
    if (persistedSnapshot?.phase === "done") {
      return {
        mode: "replay" as const,
        status: persistedSnapshot.status,
        body: persistedSnapshot.body,
        idempotencyKey: operationKey,
      };
    }

    return {
      mode: "inflight" as const,
      idempotencyKey: operationKey,
    };
  }

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

  const writtenPersistent = await writeSnapshotPersistent({
    storageKey: input.storageKey,
    ttlMs: input.ttlMs,
    snapshot,
  }).catch(() => false);

  if (writtenPersistent) {
    return;
  }

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
