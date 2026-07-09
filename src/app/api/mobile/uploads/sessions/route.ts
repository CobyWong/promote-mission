import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

const UPLOAD_BUCKET = "mission-product-images";
const CHUNK_SIZE_BYTES = 512 * 1024;
const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;

type CreateUploadSessionBody = {
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  missionSlug?: string;
  fileChecksumMd5?: string;
};

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

function normalizeMd5(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    return null;
  }

  return normalized;
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

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const auth = await authenticateMobileUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as CreateUploadSessionBody | null;
  const fileName = sanitizeFileName(String(body?.fileName ?? "proof.mp4").trim() || "proof.mp4");
  const mimeType = String(body?.mimeType ?? "video/mp4").trim() || "video/mp4";
  const fileSize = Number(body?.fileSize ?? 0);
  const missionSlug = sanitizeFileName(String(body?.missionSlug ?? "mission").trim().toLowerCase() || "mission");
  const fileChecksumMd5 = normalizeMd5(body?.fileChecksumMd5);

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json({ error: isZh ? "請提供有效的檔案大小。" : "A valid file size is required." }, { status: 400 });
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: isZh ? "媒體檔案超過 250MB 上限。" : "Media file exceeds 250MB limit." }, { status: 400 });
  }

  if (!mimeType.startsWith("video/") && !mimeType.startsWith("image/")) {
    return NextResponse.json({ error: isZh ? "不支援的媒體格式。" : "Unsupported media type." }, { status: 400 });
  }

  if (!fileChecksumMd5) {
    return NextResponse.json({ error: isZh ? "請提供有效的整檔 MD5 校驗碼。" : "A valid full-file MD5 checksum is required." }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();
  const totalParts = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE_BYTES));

  const manifest: UploadSessionManifest = {
    uploadId,
    userId: auth.user.id,
    missionSlug,
    fileName,
    mimeType,
    fileSize,
    chunkSize: CHUNK_SIZE_BYTES,
    totalParts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const manifestString = JSON.stringify(manifest);
  const manifestHashSha256 = createHash("sha256").update(manifestString).digest("hex");
  const integrity: UploadSessionIntegrity = {
    uploadId,
    userId: auth.user.id,
    expectedFileChecksumMd5: fileChecksumMd5,
    manifestHashSha256,
    issuedAt: new Date().toISOString(),
  };

  const manifestPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/session.json`;
  const integrityPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/session.integrity.json`;

  const { error } = await auth.admin.storage.from(UPLOAD_BUCKET).upload(
    manifestPath,
    Buffer.from(manifestString, "utf8"),
    {
      contentType: "application/json",
      upsert: true,
    },
  );

  if (error) {
    return NextResponse.json({ error: isZh ? "建立上傳工作階段失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  const { error: integrityError } = await auth.admin.storage.from(UPLOAD_BUCKET).upload(
    integrityPath,
    Buffer.from(JSON.stringify(integrity), "utf8"),
    {
      contentType: "application/json",
      upsert: false,
    },
  );

  if (integrityError) {
    await auth.admin.storage.from(UPLOAD_BUCKET).remove([manifestPath]);
    return NextResponse.json({ error: isZh ? "建立上傳完整性檢查失敗，請稍後再試。" : integrityError.message }, { status: 400 });
  }

  return NextResponse.json({
    uploadId,
    chunkSize: CHUNK_SIZE_BYTES,
    totalParts,
    uploadedParts: [] as number[],
    uploadedBytes: 0,
  }, { status: 201 });
}
