import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { API_BASE_URL, ApiRequestError, fetchJson, postJson } from "./api";
import { supabase } from "./supabase";

const SUBMISSION_QUEUE_VERSION = 1;
const SUBMISSION_QUEUE_MAX_ATTEMPTS = 6;
const SUBMISSION_QUEUE_RETRY_BASE_MS = 2_000;
const SUBMISSION_QUEUE_RETRY_MAX_MS = 2 * 60 * 1000;
const BACKGROUND_UPLOAD_TASK_NAME = "mobile-submission-upload-worker";
const BACKGROUND_UPLOAD_INTERVAL_SECONDS = 15 * 60;
const NATIVE_CONTINUOUS_TRANSFER_THRESHOLD_BYTES = 25 * 1024 * 1024;

type SubmissionQueueStatus = "queued" | "uploading" | "retrying" | "failed" | "completed";

type MobileSubmissionMediaAsset = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileChecksumMd5: string;
};

type MobileUploadSessionState = {
  uploadId: string | null;
  filePath: string | null;
  fileUrl: string | null;
  uploadedBytes: number;
  uploadedParts: number[];
  totalParts: number;
  chunkSize: number;
};

type MobileSubmissionQueueItem = {
  localId: string;
  idempotencyKey: string;
  missionSlug: string;
  missionTitle: string;
  reelUrl: string;
  captionSummary: string;
  notes: string;
  checks: {
    published: boolean;
    taggedBrand: boolean;
    addedCollaborator: boolean;
  };
  mediaAsset: MobileSubmissionMediaAsset | null;
  uploadSession: MobileUploadSessionState | null;
  status: SubmissionQueueStatus;
  progress: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextRetryAt: string | null;
  lastError: string | null;
  serverSubmissionId: string | null;
};

type SubmissionQueueCachePayload = {
  storedAt: number;
  items: MobileSubmissionQueueItem[];
};

type MobileSubmissionResponse = {
  id: string;
};

type MobileUploadCreateSessionResponse = {
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  uploadedParts: number[];
  uploadedBytes: number;
};

type MobileUploadSessionStatusResponse = {
  uploadId: string;
  chunkSize: number;
  totalParts: number;
  fileSize: number;
  fileName: string;
  mimeType: string;
  uploadedParts: number[];
  uploadedBytes: number;
};

type MobileUploadPartResponse = {
  ok: boolean;
  partNumber: number;
  bytes: number;
};

type MobileUploadCompleteResponse = {
  uploadId: string;
  filePath: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function getNativeChunkFileUri(uploadId: string, partNumber: number) {
  const cacheDir = LegacyFileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("File cache directory is unavailable for native upload chunking.");
  }

  return `${cacheDir}mobile-upload-${uploadId}-${partNumber}.part`;
}

function supportsNativeContinuousUpload(mediaSize: number) {
  const nativePlatform = Platform.OS === "ios" || Platform.OS === "android";
  return nativePlatform && mediaSize >= NATIVE_CONTINUOUS_TRANSFER_THRESHOLD_BYTES;
}

async function uploadPartWithNativeTransfer(options: {
  sourceUri: string;
  uploadId: string;
  partNumber: number;
  partStart: number;
  partLength: number;
  token: string;
}) {
  const tempChunkUri = getNativeChunkFileUri(options.uploadId, options.partNumber);
  const chunkBase64 = await LegacyFileSystem.readAsStringAsync(options.sourceUri, {
    encoding: LegacyFileSystem.EncodingType.Base64,
    position: options.partStart,
    length: options.partLength,
  });

  await LegacyFileSystem.writeAsStringAsync(tempChunkUri, chunkBase64, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });

  try {
    const response = await LegacyFileSystem.uploadAsync(
      `${API_BASE_URL}/api/mobile/uploads/sessions/${options.uploadId}/parts/${options.partNumber}`,
      tempChunkUri,
      {
        uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
        httpMethod: "POST",
        sessionType: LegacyFileSystem.FileSystemSessionType.BACKGROUND,
        headers: {
          Authorization: `Bearer ${options.token}`,
          "Content-Type": "application/octet-stream",
        },
      },
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Native chunk upload failed with status ${response.status}.`);
    }
  } finally {
    await LegacyFileSystem.deleteAsync(tempChunkUri, { idempotent: true }).catch(() => {
      // Cleanup failures should not stop queue progress.
    });
  }
}

function getSubmissionQueueKey(userId: string) {
  return `mobile:submission-queue:v${SUBMISSION_QUEUE_VERSION}:${userId}`;
}

function getQueueRetryDelayMs(attempts: number) {
  const raw = SUBMISSION_QUEUE_RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1);
  return Math.min(raw, SUBMISSION_QUEUE_RETRY_MAX_MS);
}

function shouldRetryQueueError(error: ApiRequestError) {
  return error.isNetworkError || error.status === 409 || error.status === 429 || error.status >= 500;
}

function getUploadedBytesFromParts(
  uploadedParts: number[],
  totalParts: number,
  chunkSize: number,
  fileSize: number,
) {
  if (uploadedParts.length === 0 || totalParts <= 0 || chunkSize <= 0 || fileSize <= 0) {
    return 0;
  }

  const uniqueParts = Array.from(new Set(uploadedParts)).filter((part) => part >= 0 && part < totalParts);
  const lastPart = totalParts - 1;
  const fullChunkCount = uniqueParts.filter((part) => part !== lastPart).length;
  const hasLastPart = uniqueParts.includes(lastPart);
  const lastChunkSize = Math.max(0, fileSize - (chunkSize * (totalParts - 1)));
  const uploadedBytes = (fullChunkCount * chunkSize) + (hasLastPart ? lastChunkSize : 0);

  return Math.min(fileSize, Math.max(0, uploadedBytes));
}

async function loadQueue(userId: string) {
  const raw = await AsyncStorage.getItem(getSubmissionQueueKey(userId));
  if (!raw) {
    return { items: [] as MobileSubmissionQueueItem[] };
  }

  try {
    const parsed = JSON.parse(raw) as SubmissionQueueCachePayload;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { items: [] as MobileSubmissionQueueItem[] };
  }
}

async function persistQueue(userId: string, items: MobileSubmissionQueueItem[]) {
  const payload: SubmissionQueueCachePayload = {
    storedAt: Date.now(),
    items,
  };

  await AsyncStorage.setItem(getSubmissionQueueKey(userId), JSON.stringify(payload));
}

async function runQueuedUploadOnce() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;
  if (!token || !userId) {
    return false;
  }

  const queueData = await loadQueue(userId);
  let items = queueData.items;
  const nowMs = Date.now();

  const nextItem = [...items]
    .filter((item) => item.status === "queued" || (item.status === "retrying" && item.nextRetryAt && Date.parse(item.nextRetryAt) <= nowMs))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .at(0);

  if (!nextItem) {
    return false;
  }

  const updateItem = async (updater: (item: MobileSubmissionQueueItem) => MobileSubmissionQueueItem) => {
    items = items.map((item) => {
      if (item.localId !== nextItem.localId) {
        return item;
      }

      return updater(item);
    });

    await persistQueue(userId, items);
  };

  await updateItem((item) => ({
    ...item,
    status: "uploading",
    attempts: item.attempts + 1,
    progress: Math.max(item.progress, 1),
    updatedAt: new Date().toISOString(),
    nextRetryAt: null,
    lastError: null,
  }));

  try {
    const currentItem = () => items.find((item) => item.localId === nextItem.localId) ?? nextItem;
    let reelUrlForSubmission = currentItem().reelUrl.trim();

    if (currentItem().mediaAsset) {
      const media = currentItem().mediaAsset as MobileSubmissionMediaAsset;
      let mediaChecksumMd5 = media.fileChecksumMd5?.toLowerCase();
      if (!/^[a-f0-9]{32}$/.test(mediaChecksumMd5 ?? "")) {
        const fileInfo = await LegacyFileSystem.getInfoAsync(media.uri, { md5: true });
        mediaChecksumMd5 = fileInfo.exists && typeof fileInfo.md5 === "string" ? fileInfo.md5.toLowerCase() : "";
        if (!/^[a-f0-9]{32}$/.test(mediaChecksumMd5)) {
          throw new Error("Unable to compute file checksum for upload integrity.");
        }

        await updateItem((item) => ({
          ...item,
          mediaAsset: item.mediaAsset
            ? {
              ...item.mediaAsset,
              fileChecksumMd5: mediaChecksumMd5,
            }
            : null,
        }));
      }

      const shouldUseNativeContinuousPath = supportsNativeContinuousUpload(media.fileSize);
      let uploadSession = currentItem().uploadSession;

      if (!uploadSession?.uploadId) {
        const createdSession = await postJson<MobileUploadCreateSessionResponse>(
          "/api/mobile/uploads/sessions",
          {
            fileName: media.fileName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            missionSlug: currentItem().missionSlug,
            fileChecksumMd5: mediaChecksumMd5,
          },
          token,
        );

        uploadSession = {
          uploadId: createdSession.uploadId,
          filePath: null,
          fileUrl: null,
          uploadedBytes: createdSession.uploadedBytes,
          uploadedParts: createdSession.uploadedParts,
          totalParts: createdSession.totalParts,
          chunkSize: createdSession.chunkSize,
        };

        const initialUploadedBytes = uploadSession.uploadedBytes;

        await updateItem((item) => ({
          ...item,
          uploadSession,
          progress: Math.max(item.progress, Math.round((initialUploadedBytes / Math.max(media.fileSize, 1)) * 100)),
          updatedAt: new Date().toISOString(),
        }));
      }

      if (!uploadSession?.uploadId) {
        throw new Error("Upload session initialization failed.");
      }

      let sessionStatus: MobileUploadSessionStatusResponse;
      try {
        sessionStatus = await fetchJson<MobileUploadSessionStatusResponse>(`/api/mobile/uploads/sessions/${uploadSession.uploadId}`, token);
      } catch (error) {
        if (!(error instanceof ApiRequestError) || error.status !== 404) {
          throw error;
        }

        const recreatedSession = await postJson<MobileUploadCreateSessionResponse>(
          "/api/mobile/uploads/sessions",
          {
            fileName: media.fileName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            missionSlug: currentItem().missionSlug,
            fileChecksumMd5: mediaChecksumMd5,
          },
          token,
        );

        sessionStatus = {
          uploadId: recreatedSession.uploadId,
          chunkSize: recreatedSession.chunkSize,
          totalParts: recreatedSession.totalParts,
          fileSize: media.fileSize,
          fileName: media.fileName,
          mimeType: media.mimeType,
          uploadedParts: recreatedSession.uploadedParts,
          uploadedBytes: recreatedSession.uploadedBytes,
        };
      }

      const uploadedPartsSet = new Set(sessionStatus.uploadedParts);
      const totalParts = sessionStatus.totalParts;
      const chunkSize = sessionStatus.chunkSize;

      await updateItem((item) => ({
        ...item,
        uploadSession: {
          uploadId: sessionStatus.uploadId,
          filePath: item.uploadSession?.filePath ?? null,
          fileUrl: item.uploadSession?.fileUrl ?? null,
          uploadedBytes: Math.min(sessionStatus.uploadedBytes, media.fileSize),
          uploadedParts: Array.from(uploadedPartsSet).sort((left, right) => left - right),
          totalParts,
          chunkSize,
        },
        progress: Math.round((Math.min(sessionStatus.uploadedBytes, media.fileSize) / Math.max(media.fileSize, 1)) * 100),
        updatedAt: new Date().toISOString(),
      }));

      for (let partNumber = 0; partNumber < totalParts; partNumber += 1) {
        if (uploadedPartsSet.has(partNumber)) {
          continue;
        }

        const partStart = partNumber * chunkSize;
        const partLength = Math.min(chunkSize, Math.max(0, media.fileSize - partStart));
        if (partLength <= 0) {
          continue;
        }

        if (shouldUseNativeContinuousPath) {
          await uploadPartWithNativeTransfer({
            sourceUri: media.uri,
            uploadId: sessionStatus.uploadId,
            partNumber,
            partStart,
            partLength,
            token,
          });
        } else {
          const chunkBase64 = await LegacyFileSystem.readAsStringAsync(media.uri, {
            encoding: LegacyFileSystem.EncodingType.Base64,
            position: partStart,
            length: partLength,
          });

          await postJson<MobileUploadPartResponse>(
            `/api/mobile/uploads/sessions/${sessionStatus.uploadId}/parts/${partNumber}`,
            { chunkBase64 },
            token,
          );
        }

        uploadedPartsSet.add(partNumber);
        const uploadedParts = Array.from(uploadedPartsSet).sort((left, right) => left - right);
        const uploadedBytes = getUploadedBytesFromParts(uploadedParts, totalParts, chunkSize, media.fileSize);

        await updateItem((item) => ({
          ...item,
          uploadSession: {
            uploadId: sessionStatus.uploadId,
            filePath: item.uploadSession?.filePath ?? null,
            fileUrl: item.uploadSession?.fileUrl ?? null,
            uploadedBytes,
            uploadedParts,
            totalParts,
            chunkSize,
          },
          progress: Math.round((uploadedBytes / Math.max(media.fileSize, 1)) * 100),
          updatedAt: new Date().toISOString(),
        }));
      }

      const completedUpload = await postJson<MobileUploadCompleteResponse>(
        `/api/mobile/uploads/sessions/${sessionStatus.uploadId}/complete`,
        {},
        token,
      );

      reelUrlForSubmission = completedUpload.fileUrl;
      await updateItem((item) => ({
        ...item,
        uploadSession: {
          uploadId: completedUpload.uploadId,
          filePath: completedUpload.filePath,
          fileUrl: completedUpload.fileUrl,
          uploadedBytes: completedUpload.fileSize,
          uploadedParts: Array.from({ length: totalParts }, (_, index) => index),
          totalParts,
          chunkSize,
        },
        progress: 100,
        updatedAt: new Date().toISOString(),
      }));
    }

    if (!reelUrlForSubmission.startsWith("http")) {
      throw new Error("Missing reel URL for submission.");
    }

    const result = await postJson<MobileSubmissionResponse>(
      "/api/mobile/submissions",
      {
        slug: currentItem().missionSlug,
        reelUrl: reelUrlForSubmission,
        captionSummary: currentItem().captionSummary,
        notes: currentItem().notes,
        checks: currentItem().checks,
      },
      token,
      {
        retries: 0,
        headers: {
          "idempotency-key": currentItem().idempotencyKey,
        },
      },
    );

    await updateItem((item) => ({
      ...item,
      status: "completed",
      progress: 100,
      updatedAt: new Date().toISOString(),
      nextRetryAt: null,
      lastError: null,
      serverSubmissionId: result.id,
    }));

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed. Please retry.";
    const now = Date.now();

    await updateItem((item) => {
      const uploadedBytes = item.uploadSession?.uploadedBytes ?? 0;
      const mediaBytes = item.mediaAsset?.fileSize ?? 0;
      const mediaProgress = mediaBytes > 0 ? Math.round((uploadedBytes / mediaBytes) * 100) : item.progress;
      const retryable = error instanceof ApiRequestError && shouldRetryQueueError(error);

      if (retryable && item.attempts < SUBMISSION_QUEUE_MAX_ATTEMPTS) {
        const retryDelay = getQueueRetryDelayMs(item.attempts);
        return {
          ...item,
          status: "retrying",
          progress: Math.max(0, Math.min(100, mediaProgress)),
          updatedAt: new Date().toISOString(),
          nextRetryAt: new Date(now + retryDelay).toISOString(),
          lastError: message,
        };
      }

      return {
        ...item,
        status: "failed",
        progress: Math.max(0, Math.min(100, mediaProgress)),
        updatedAt: new Date().toISOString(),
        nextRetryAt: null,
        lastError: message,
      };
    });

    return false;
  }
}

if (!TaskManager.isTaskDefined(BACKGROUND_UPLOAD_TASK_NAME)) {
  TaskManager.defineTask(BACKGROUND_UPLOAD_TASK_NAME, async () => {
    try {
      const didProcess = await runQueuedUploadOnce();
      return didProcess ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerSubmissionUploadBackgroundTask() {
  const isAvailable = await TaskManager.isAvailableAsync();
  if (!isAvailable) {
    return { ok: false, reason: "TaskManager unavailable in this runtime." };
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_UPLOAD_TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_UPLOAD_TASK_NAME, {
      minimumInterval: BACKGROUND_UPLOAD_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  return { ok: true, reason: null };
}

export async function runSubmissionUploadWorkerNow() {
  return runQueuedUploadOnce();
}
