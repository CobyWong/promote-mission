import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { logApiEvent } from "@/lib/observability";

const UPLOAD_BUCKET = "mission-product-images";

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

type UploadPartMeta = {
  partNumber: number;
  bytes: number;
  checksumSha256: string;
  expectedChecksumSha256?: string;
  receivedAt: string;
};

type UploadSessionIntegrity = {
  uploadId: string;
  userId: string;
  expectedFileChecksumMd5: string;
  manifestHashSha256: string;
  issuedAt: string;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function parseUploadedPartNumber(name: string) {
  const parsed = Number.parseInt(name.replace(/\.part$/i, ""), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function getExpectedPartBytes(manifest: UploadSessionManifest, partNumber: number) {
  const isLastPart = partNumber === manifest.totalParts - 1;
  if (!isLastPart) {
    return manifest.chunkSize;
  }

  const remainder = manifest.fileSize - (manifest.chunkSize * (manifest.totalParts - 1));
  return Math.max(1, remainder);
}

async function authenticateMobileUser(request: Request) {
  const isZh = isZhRequest(request);
  if (!hasSupabaseAdminConfig()) {
    return { error: NextResponse.json({ error: isZh ? "上傳服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 }) };
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return { error: NextResponse.json({ error: isZh ? "缺少登入憑證，請重新登入。" : "Missing bearer token." }, { status: 401 }) };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: NextResponse.json({ error: isZh ? "上傳服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 }) };
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return { error: NextResponse.json({ error: isZh ? "登入狀態無效或已過期，請重新登入。" : (userError?.message ?? "Unauthorized.") }, { status: 401 }) };
  }

  return { admin, user };
}

async function rejectWithTamperAudit(input: {
  request: Request;
  requestId: string;
  userId: string;
  uploadId: string;
  userMessage: string;
  reason: string;
  context?: Record<string, unknown>;
  status?: number;
}) {
  await logApiEvent({
    level: "warn",
    route: "/api/mobile/uploads/sessions/[uploadId]/complete",
    event: "mobile.upload.integrity_tamper_detected",
    request: input.request,
    requestId: input.requestId,
    userId: input.userId,
    message: input.reason,
    context: {
      uploadId: input.uploadId,
      ...input.context,
    },
  });

  return NextResponse.json({ error: input.userMessage }, { status: input.status ?? 409 });
}

export async function POST(request: Request, context: { params: Promise<{ uploadId: string }> }) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const isZh = isZhRequest(request);
  const auth = await authenticateMobileUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const params = await context.params;
  const uploadId = String(params.uploadId ?? "").trim();
  if (!uploadId) {
    return NextResponse.json({ error: isZh ? "請提供上傳識別碼。" : "Upload ID is required." }, { status: 400 });
  }

  const manifestPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/session.json`;
  const { data: manifestData, error: manifestError } = await auth.admin.storage.from(UPLOAD_BUCKET).download(manifestPath);

  if (manifestError || !manifestData) {
    return NextResponse.json({ error: isZh ? "找不到上傳工作階段。" : (manifestError?.message ?? "Upload session not found.") }, { status: 404 });
  }

  const manifest = JSON.parse(await manifestData.text()) as UploadSessionManifest;
  const integrityPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/session.integrity.json`;
  const { data: integrityData, error: integrityError } = await auth.admin.storage.from(UPLOAD_BUCKET).download(integrityPath);

  if (integrityError || !integrityData) {
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "上傳完整性驗證資料遺失，請重新上傳。" : "Upload session integrity policy is missing.",
      reason: "Upload session integrity policy is missing.",
      context: {
        detail: integrityError?.message ?? null,
      },
    });
  }

  let integrity: UploadSessionIntegrity;
  try {
    integrity = JSON.parse(await integrityData.text()) as UploadSessionIntegrity;
  } catch {
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "上傳完整性驗證資料無效，請重新上傳。" : "Upload session integrity policy is invalid.",
      reason: "Upload session integrity policy is invalid.",
    });
  }

  if (!integrity.expectedFileChecksumMd5 || !/^[a-f0-9]{32}$/.test(integrity.expectedFileChecksumMd5)) {
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "上傳檔案校驗設定無效，請重新上傳。" : "Upload session expected checksum is invalid.",
      reason: "Upload session expected checksum is invalid.",
    });
  }

  const manifestHashSha256 = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  if (manifestHashSha256 !== integrity.manifestHashSha256) {
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "上傳工作階段驗證失敗，請重新上傳。" : "Upload session manifest hash mismatch.",
      reason: "Upload session manifest hash mismatch.",
      context: {
        expected: integrity.manifestHashSha256,
        actual: manifestHashSha256,
      },
    });
  }

  const { data: partObjects, error: listError } = await auth.admin.storage
    .from(UPLOAD_BUCKET)
    .list(`mobile-submission-proofs/${auth.user.id}/${uploadId}/parts`, {
      limit: Math.max(1000, manifest.totalParts + 20),
      sortBy: { column: "name", order: "asc" },
    });

  if (listError) {
    return NextResponse.json({ error: isZh ? "讀取已上傳分段失敗，請稍後再試。" : listError.message }, { status: 400 });
  }

  const uploadedParts = (partObjects ?? [])
    .map((item) => parseUploadedPartNumber(item.name))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  const contiguous = uploadedParts.length === manifest.totalParts
    && uploadedParts.every((part, index) => part === index);

  if (!contiguous) {
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "上傳分段順序無效，請重新上傳。" : "Upload session part index sequence is invalid.",
      reason: "Upload session part index sequence is invalid.",
      context: {
        expectedTotalParts: manifest.totalParts,
        receivedPartCount: uploadedParts.length,
      },
    });
  }

  const tempMergedPath = join(tmpdir(), `mobile-upload-merged-${auth.user.id}-${uploadId}-${Date.now()}.tmp`);
  const tempMergedFile = await open(tempMergedPath, "w");
  let mergedBytes = 0;
  const mergedHash = createHash("md5");

  try {
    for (let index = 0; index < manifest.totalParts; index += 1) {
      const partPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${index}.part`;
      const { data: partData, error: partError } = await auth.admin.storage.from(UPLOAD_BUCKET).download(partPath);

      if (partError || !partData) {
        return rejectWithTamperAudit({
          request,
          requestId,
          userId: auth.user.id,
          uploadId,
          userMessage: isZh ? `缺少第 ${index} 段上傳資料，請重新上傳。` : (partError?.message ?? `Missing part ${index}.`),
          reason: partError?.message ?? `Missing part ${index}.`,
          context: {
            partNumber: index,
          },
        });
      }

      const partMetaPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${index}.meta.json`;
      const { data: partMetaData, error: partMetaError } = await auth.admin.storage.from(UPLOAD_BUCKET).download(partMetaPath);
      let partMeta: UploadPartMeta | null = null;
      if (!partMetaError && partMetaData) {
        try {
          partMeta = JSON.parse(await partMetaData.text()) as UploadPartMeta;
        } catch {
          return rejectWithTamperAudit({
            request,
            requestId,
            userId: auth.user.id,
            uploadId,
            userMessage: isZh ? `第 ${index} 段中繼資料無效，請重新上傳。` : `Invalid metadata for part ${index}.`,
            reason: `Invalid metadata for part ${index}.`,
            context: {
              partNumber: index,
            },
          });
        }
      }

      const webStream = partData.stream();
      const nodeStream = Readable.fromWeb(webStream as unknown as NodeReadableStream);
      const partHash = createHash("sha256");
      let partBytes = 0;

      for await (const chunk of nodeStream) {
        const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        partHash.update(bufferChunk);
        mergedHash.update(bufferChunk);
        partBytes += bufferChunk.byteLength;
        const writeResult = await tempMergedFile.write(bufferChunk);
        mergedBytes += writeResult.bytesWritten;
      }

      const expectedPartBytes = getExpectedPartBytes(manifest, index);
      if (partBytes !== expectedPartBytes) {
        return rejectWithTamperAudit({
          request,
          requestId,
          userId: auth.user.id,
          uploadId,
          userMessage: isZh ? `第 ${index} 段大小不符，請重新上傳。` : `Part ${index} size mismatch. Expected ${expectedPartBytes} bytes, received ${partBytes}.`,
          reason: `Part ${index} size mismatch. Expected ${expectedPartBytes} bytes, received ${partBytes}.`,
          context: {
            partNumber: index,
            expectedPartBytes,
            receivedPartBytes: partBytes,
          },
        });
      }

      if (partMeta && partMeta.bytes !== partBytes) {
        return rejectWithTamperAudit({
          request,
          requestId,
          userId: auth.user.id,
          uploadId,
          userMessage: isZh ? `第 ${index} 段大小驗證失敗，請重新上傳。` : `Part ${index} metadata byte mismatch.`,
          reason: `Part ${index} metadata byte mismatch.`,
          context: {
            partNumber: index,
            metadataBytes: partMeta.bytes,
            actualBytes: partBytes,
          },
        });
      }

      if (partMeta && partMeta.checksumSha256) {
        const actualChecksum = partHash.digest("hex");
        if (actualChecksum !== partMeta.checksumSha256.toLowerCase()) {
          return rejectWithTamperAudit({
            request,
            requestId,
            userId: auth.user.id,
            uploadId,
            userMessage: isZh ? `第 ${index} 段校驗失敗，請重新上傳。` : `Part ${index} checksum validation failed.`,
            reason: `Part ${index} checksum validation failed.`,
            context: {
              partNumber: index,
              expectedChecksum: partMeta.checksumSha256.toLowerCase(),
              actualChecksum,
            },
          });
        }

        if (partMeta.expectedChecksumSha256
          && actualChecksum !== partMeta.expectedChecksumSha256.toLowerCase()) {
          return rejectWithTamperAudit({
            request,
            requestId,
            userId: auth.user.id,
            uploadId,
            userMessage: isZh ? `第 ${index} 段預期校驗失敗，請重新上傳。` : `Part ${index} expected checksum mismatch.`,
            reason: `Part ${index} expected checksum mismatch.`,
            context: {
              partNumber: index,
              expectedChecksum: partMeta.expectedChecksumSha256.toLowerCase(),
              actualChecksum,
            },
          });
        }
      }
    }
  } finally {
    await tempMergedFile.close();
  }

  if (mergedBytes !== manifest.fileSize) {
    await rm(tempMergedPath, { force: true }).catch(() => {
      // Best-effort cleanup for mismatched merge.
    });
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "合併後檔案大小不符，請重新上傳。" : "Uploaded bytes do not match expected file size.",
      reason: "Uploaded bytes do not match expected file size.",
      context: {
        expectedFileSize: manifest.fileSize,
        mergedBytes,
      },
    });
  }

  const mergedChecksumMd5 = mergedHash.digest("hex");
  if (mergedChecksumMd5 !== integrity.expectedFileChecksumMd5.toLowerCase()) {
    await rm(tempMergedPath, { force: true }).catch(() => {
      // Best-effort cleanup for checksum mismatch.
    });
    return rejectWithTamperAudit({
      request,
      requestId,
      userId: auth.user.id,
      uploadId,
      userMessage: isZh ? "最終檔案校驗失敗，請重新上傳。" : "Final file checksum mismatch.",
      reason: "Final file checksum mismatch.",
      context: {
        expectedChecksumMd5: integrity.expectedFileChecksumMd5.toLowerCase(),
        actualChecksumMd5: mergedChecksumMd5,
      },
    });
  }

  const safeMissionSlug = sanitizeFileName(manifest.missionSlug.toLowerCase() || "mission");
  const safeFileName = sanitizeFileName(manifest.fileName);
  const finalPath = `mobile-submission-proofs/${auth.user.id}/${safeMissionSlug}/${Date.now()}-${safeFileName}`;

  const mergedReadStream = createReadStream(tempMergedPath);
  const { error: finalUploadError } = await auth.admin.storage.from(UPLOAD_BUCKET).upload(
    finalPath,
    mergedReadStream,
    {
      contentType: manifest.mimeType,
      upsert: false,
    },
  );

  await rm(tempMergedPath, { force: true }).catch(() => {
    // Best-effort cleanup for merged temp file.
  });

  if (finalUploadError) {
    return NextResponse.json({ error: isZh ? "完成檔案上傳失敗，請稍後再試。" : finalUploadError.message }, { status: 400 });
  }

  const cleanupPaths = [
    manifestPath,
    integrityPath,
    ...uploadedParts.map((partNumber) => `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${partNumber}.part`),
    ...uploadedParts.map((partNumber) => `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${partNumber}.meta.json`),
  ];

  await auth.admin.storage.from(UPLOAD_BUCKET).remove(cleanupPaths);

  const { data: finalUrlData } = auth.admin.storage.from(UPLOAD_BUCKET).getPublicUrl(finalPath);

  return NextResponse.json({
    uploadId,
    filePath: finalPath,
    fileUrl: finalUrlData.publicUrl,
    fileName: manifest.fileName,
    mimeType: manifest.mimeType,
    fileSize: manifest.fileSize,
  }, { status: 201 });
}
