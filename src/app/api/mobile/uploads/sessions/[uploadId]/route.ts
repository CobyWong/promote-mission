import { NextResponse } from "next/server";

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

function parseUploadedPartNumber(name: string) {
  const parsed = Number.parseInt(name.replace(/\.part$/i, ""), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request, context: { params: Promise<{ uploadId: string }> }) {
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

  const manifestText = await manifestData.text();
  const manifest = JSON.parse(manifestText) as UploadSessionManifest;

  const { data: partObjects, error: partListError } = await auth.admin.storage
    .from(UPLOAD_BUCKET)
    .list(`mobile-submission-proofs/${auth.user.id}/${uploadId}/parts`, {
      limit: Math.max(1000, manifest.totalParts + 20),
      sortBy: { column: "name", order: "asc" },
    });

  if (partListError) {
    return NextResponse.json({ error: isZh ? "讀取已上傳區塊失敗，請稍後再試。" : partListError.message }, { status: 400 });
  }

  const uploadedParts = (partObjects ?? [])
    .map((item) => parseUploadedPartNumber(item.name))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  const uploadedBytes = uploadedParts.reduce((sum, partNumber) => {
    const isLastPart = partNumber === manifest.totalParts - 1;
    if (isLastPart) {
      return manifest.fileSize;
    }

    return Math.min(manifest.fileSize, sum + manifest.chunkSize);
  }, 0);

  return NextResponse.json({
    uploadId,
    chunkSize: manifest.chunkSize,
    totalParts: manifest.totalParts,
    fileSize: manifest.fileSize,
    fileName: manifest.fileName,
    mimeType: manifest.mimeType,
    uploadedParts,
    uploadedBytes: Math.min(uploadedBytes, manifest.fileSize),
  });
}
