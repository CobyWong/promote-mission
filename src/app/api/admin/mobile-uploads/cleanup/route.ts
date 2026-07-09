import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCleanupCronToken,
  hasCleanupCronToken,
  hasSupabaseAdminConfig,
} from "@/lib/supabase/env";

const UPLOAD_BUCKET = "mission-product-images";
const UPLOAD_ROOT_PREFIX = "mobile-submission-proofs";
const LIST_PAGE_SIZE = 100;
const UPLOAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UploadSessionManifest = {
  uploadId: string;
  userId: string;
  missionSlug: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  chunkSize: number;
  totalParts: number;
  createdAt: string;
  updatedAt: string;
};

type StorageListEntry = {
  name: string;
  metadata?: Record<string, unknown> | null;
};

function parseRetentionHours(raw: string | null) {
  if (!raw) {
    return 48;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return 48;
  }

  return Math.min(24 * 30, Math.max(1, parsed));
}

function computeCutoffIso(retentionHours: number) {
  const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
  return cutoffDate.toISOString();
}

function isFolderEntry(entry: StorageListEntry) {
  return entry.metadata == null;
}

function isUploadFolderName(name: string) {
  return UPLOAD_ID_PATTERN.test(name);
}

async function listAllEntries(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  prefix: string,
) {
  const entries: StorageListEntry[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from(UPLOAD_BUCKET)
      .list(prefix, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      return { entries, error: error.message };
    }

    const batch = (data ?? []) as StorageListEntry[];
    entries.push(...batch);

    if (batch.length < LIST_PAGE_SIZE) {
      break;
    }

    offset += LIST_PAGE_SIZE;
  }

  return { entries, error: null as string | null };
}

async function readSessionManifest(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  sessionPath: string,
) {
  const { data, error } = await admin.storage.from(UPLOAD_BUCKET).download(sessionPath);
  if (error || !data) {
    return { manifest: null, error: error?.message ?? "Manifest not found" };
  }

  try {
    const manifest = JSON.parse(await data.text()) as UploadSessionManifest;
    return { manifest, error: null as string | null };
  } catch {
    return { manifest: null, error: "Invalid manifest JSON" };
  }
}

async function removePaths(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  paths: string[],
) {
  if (paths.length === 0) {
    return { removedCount: 0, error: null as string | null };
  }

  const { data, error } = await admin.storage.from(UPLOAD_BUCKET).remove(paths);
  if (error) {
    return { removedCount: 0, error: error.message };
  }

  return { removedCount: (data ?? []).length, error: null as string | null };
}

async function isAuthorized(request: Request) {
  const hasAdmin = await hasAdminSession();

  if (hasCleanupCronToken()) {
    const providedToken = request.headers.get("x-cron-token")?.trim() ?? "";
    if (providedToken && providedToken === getCleanupCronToken()) {
      return true;
    }
  }

  return hasAdmin;
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        removedSessionCount: 0,
        removedOrphanPartFileCount: 0,
        skipped: true,
        reason: "SUPABASE_ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const authorized = await isAuthorized(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const retentionHours = parseRetentionHours(url.searchParams.get("retentionHours"));
  const cutoffIso = computeCutoffIso(retentionHours);

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        removedSessionCount: 0,
        removedOrphanPartFileCount: 0,
        skipped: true,
        reason: "SUPABASE_ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const userList = await listAllEntries(admin, UPLOAD_ROOT_PREFIX);
  if (userList.error) {
    return NextResponse.json({ error: userList.error }, { status: 500 });
  }

  const userFolders = userList.entries.filter((entry) => isFolderEntry(entry));
  let removedSessionCount = 0;
  let removedOrphanPartFileCount = 0;
  let scannedUploadFolderCount = 0;
  const errors: string[] = [];

  for (const userFolder of userFolders) {
    const userPrefix = `${UPLOAD_ROOT_PREFIX}/${userFolder.name}`;
    const uploadFolderList = await listAllEntries(admin, userPrefix);
    if (uploadFolderList.error) {
      errors.push(`list:${userPrefix}:${uploadFolderList.error}`);
      continue;
    }

    const uploadFolders = uploadFolderList.entries.filter((entry) => isFolderEntry(entry) && isUploadFolderName(entry.name));

    for (const uploadFolder of uploadFolders) {
      scannedUploadFolderCount += 1;
      const uploadId = uploadFolder.name;
      const manifestPath = `${userPrefix}/${uploadId}/session.json`;
      const manifestResult = await readSessionManifest(admin, manifestPath);

      // Orphan parts without a manifest should be removed right away.
      if (!manifestResult.manifest) {
        const partList = await listAllEntries(admin, `${userPrefix}/${uploadId}/parts`);
        if (partList.error) {
          errors.push(`parts:${userPrefix}/${uploadId}:${partList.error}`);
          continue;
        }

        const partPaths = partList.entries
          .filter((entry) => !isFolderEntry(entry))
          .map((entry) => `${userPrefix}/${uploadId}/parts/${entry.name}`);

        const removeResult = await removePaths(admin, partPaths);
        if (removeResult.error) {
          errors.push(`remove:${userPrefix}/${uploadId}:${removeResult.error}`);
          continue;
        }

        removedOrphanPartFileCount += removeResult.removedCount;
        continue;
      }

      const createdAt = Date.parse(manifestResult.manifest.createdAt);
      if (Number.isNaN(createdAt) || createdAt > Date.parse(cutoffIso)) {
        continue;
      }

      const partList = await listAllEntries(admin, `${userPrefix}/${uploadId}/parts`);
      if (partList.error) {
        errors.push(`parts:${userPrefix}/${uploadId}:${partList.error}`);
        continue;
      }

      const stalePaths = [
        manifestPath,
        ...partList.entries
          .filter((entry) => !isFolderEntry(entry))
          .map((entry) => `${userPrefix}/${uploadId}/parts/${entry.name}`),
      ];

      const removeResult = await removePaths(admin, stalePaths);
      if (removeResult.error) {
        errors.push(`remove:${userPrefix}/${uploadId}:${removeResult.error}`);
        continue;
      }

      removedSessionCount += 1;
    }
  }

  return NextResponse.json(
    {
      retentionHours,
      cutoffIso,
      scannedUserFolderCount: userFolders.length,
      scannedUploadFolderCount,
      removedSessionCount,
      removedOrphanPartFileCount,
      cleanedAt: new Date().toISOString(),
      warnings: errors.slice(0, 20),
    },
    { status: 200 },
  );
}
