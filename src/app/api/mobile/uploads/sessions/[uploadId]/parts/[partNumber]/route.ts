import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

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

type UploadPartBody = {
  chunkBase64?: string;
  checksumSha256?: string;
};

type UploadPartMeta = {
  partNumber: number;
  bytes: number;
  checksumSha256: string;
  expectedChecksumSha256?: string;
  receivedAt: string;
};

function normalizeChecksum(raw: string | null | undefined) {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    return null;
  }

  return normalized;
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

export async function POST(
  request: Request,
  context: { params: Promise<{ uploadId: string; partNumber: string }> },
) {
  const isZh = isZhRequest(request);
  const auth = await authenticateMobileUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const params = await context.params;
  const uploadId = String(params.uploadId ?? "").trim();
  const partNumber = Number.parseInt(String(params.partNumber ?? ""), 10);

  if (!uploadId || Number.isNaN(partNumber) || partNumber < 0) {
    return NextResponse.json({ error: isZh ? "上傳識別碼或分段編號無效。" : "Invalid upload or part number." }, { status: 400 });
  }

  const manifestPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/session.json`;
  const { data: manifestData, error: manifestError } = await auth.admin.storage.from(UPLOAD_BUCKET).download(manifestPath);

  if (manifestError || !manifestData) {
    return NextResponse.json({ error: isZh ? "找不到上傳工作階段。" : (manifestError?.message ?? "Upload session not found.") }, { status: 404 });
  }

  const manifest = JSON.parse(await manifestData.text()) as UploadSessionManifest;
  if (partNumber >= manifest.totalParts) {
    return NextResponse.json({ error: isZh ? "分段編號超出預期範圍。" : "Part number exceeds expected total parts." }, { status: 400 });
  }

  const headerChecksum = normalizeChecksum(request.headers.get("x-part-sha256"));

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  let chunkBuffer: Buffer;
  let requestedChecksum: string | null = headerChecksum;

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as UploadPartBody | null;
    const chunkBase64 = String(body?.chunkBase64 ?? "").trim();

    if (!chunkBase64) {
      return NextResponse.json({ error: isZh ? "請提供分段內容。" : "Chunk payload is required." }, { status: 400 });
    }

    chunkBuffer = Buffer.from(chunkBase64, "base64");
    requestedChecksum = headerChecksum ?? normalizeChecksum(body?.checksumSha256);
  } else {
    const rawChunk = await request.arrayBuffer().catch(() => null);
    if (!rawChunk) {
      return NextResponse.json({ error: isZh ? "請提供二進位分段內容。" : "Binary chunk payload is required." }, { status: 400 });
    }

    chunkBuffer = Buffer.from(rawChunk);
  }

  if (chunkBuffer.byteLength <= 0) {
    return NextResponse.json({ error: isZh ? "分段內容不得為空。" : "Chunk payload is empty." }, { status: 400 });
  }

  const expectedBytes = getExpectedPartBytes(manifest, partNumber);
  if (chunkBuffer.byteLength !== expectedBytes) {
    return NextResponse.json(
      { error: isZh ? `分段大小不符：第 ${partNumber} 段預期 ${expectedBytes} bytes，實收 ${chunkBuffer.byteLength} bytes。` : `Part size mismatch. Expected ${expectedBytes} bytes for part ${partNumber}, received ${chunkBuffer.byteLength}.` },
      { status: 400 },
    );
  }

  const checksumSha256 = createHash("sha256").update(chunkBuffer).digest("hex");
  if (requestedChecksum && requestedChecksum !== checksumSha256) {
    return NextResponse.json(
      { error: isZh ? `第 ${partNumber} 段校驗碼不一致。` : `Checksum mismatch for part ${partNumber}.` },
      { status: 400 },
    );
  }

  const chunkPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${partNumber}.part`;
  const { error: uploadError } = await auth.admin.storage.from(UPLOAD_BUCKET).upload(chunkPath, chunkBuffer, {
    contentType: "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: isZh ? "上傳分段失敗，請稍後再試。" : uploadError.message }, { status: 400 });
  }

  const partMeta: UploadPartMeta = {
    partNumber,
    bytes: chunkBuffer.byteLength,
    checksumSha256,
    expectedChecksumSha256: requestedChecksum ?? undefined,
    receivedAt: new Date().toISOString(),
  };

  const partMetaPath = `mobile-submission-proofs/${auth.user.id}/${uploadId}/parts/${partNumber}.meta.json`;
  const { error: metaUploadError } = await auth.admin.storage.from(UPLOAD_BUCKET).upload(
    partMetaPath,
    Buffer.from(JSON.stringify(partMeta), "utf8"),
    {
      contentType: "application/json",
      upsert: true,
    },
  );

  if (metaUploadError) {
    return NextResponse.json({ error: isZh ? "寫入分段中繼資料失敗，請稍後再試。" : metaUploadError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    partNumber,
    bytes: chunkBuffer.byteLength,
    checksumSha256,
    checksumValidated: Boolean(requestedChecksum),
  });
}
