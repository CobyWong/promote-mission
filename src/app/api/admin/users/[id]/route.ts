import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails, getBrandEmails, isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileUpdatePayload = {
  full_name?: string;
  instagram_handle?: string;
  niche?: string;
  followers_range?: string;
  portfolio_url?: string;
};

function toNullableString(value: unknown) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : null;
}

async function assertAdminAccess() {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return { error: NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 }) };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }

  return { admin, viewerId: user?.id ?? null };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const isZh = isZhRequest(request);
  const t = {
    csrfFailed: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed.",
    serviceUnavailable: isZh ? "管理服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured.",
    forbidden: isZh ? "你目前沒有管理員權限。" : "Admin access required.",
    profileUpdateFailed: isZh ? "更新用戶資料失敗，請稍後再試。" : "Failed to update user profile.",
    authMetadataFailed: isZh ? "更新帳號資料失敗，請稍後再試。" : "Failed to update auth metadata.",
    deleteSelfForbidden: isZh ? "不可刪除目前登入的管理員帳號。" : "You cannot delete your own admin account.",
    deleteFailed: isZh ? "刪除用戶失敗，請稍後再試。" : "Failed to delete user.",
  };

  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: t.csrfFailed }, { status: 403 });
  }

  const [{ id }, access] = await Promise.all([
    context.params,
    assertAdminAccess(),
  ]);

  if ("error" in access && access.error) {
    const status = access.error.status;
    return NextResponse.json({ error: status === 503 ? t.serviceUnavailable : t.forbidden }, { status });
  }

  const body = (await request.json()) as ProfileUpdatePayload;

  const fullName = toNullableString(body.full_name);
  const instagramHandleRaw = toNullableString(body.instagram_handle);
  const instagramHandle = instagramHandleRaw ? `@${instagramHandleRaw.replace(/^@/, "")}` : null;
  const niche = toNullableString(body.niche);
  const followersRange = toNullableString(body.followers_range);
  const portfolioUrl = toNullableString(body.portfolio_url);

  const profilePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: fullName,
    instagram_handle: instagramHandle,
    niche,
    followers_range: followersRange,
    portfolio_url: portfolioUrl,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await access.admin
    .from("profiles")
    .upsert({
      id,
      ...profilePayload,
    })
    .select("*")
    .single();

  if (profileError) {
    return NextResponse.json({ error: t.profileUpdateFailed }, { status: 400 });
  }

  const { data: authUserData, error: authUserError } = await access.admin.auth.admin.updateUserById(id, {
    user_metadata: {
      full_name: fullName,
      instagram_handle: instagramHandle,
      niche,
      followers_range: followersRange,
      portfolio_url: portfolioUrl,
    },
  });

  if (authUserError || !authUserData.user) {
    return NextResponse.json({ error: t.authMetadataFailed }, { status: 400 });
  }

  const user = authUserData.user;
  const normalizedEmail = (user.email ?? "").toLowerCase();
  const adminEmails = new Set(getAdminEmails());
  const brandEmails = new Set(getBrandEmails());

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? "-",
      fullName: fullName ?? user.email?.split("@")[0] ?? "-",
      instagramHandle: instagramHandle ?? "",
      niche: niche ?? "",
      followersRange: followersRange ?? "",
      portfolioUrl: portfolioUrl ?? "",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? "",
      isAdmin: adminEmails.has(normalizedEmail),
      isBrand: brandEmails.has(normalizedEmail),
    },
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const isZh = isZhRequest(request);
  const t = {
    csrfFailed: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed.",
    serviceUnavailable: isZh ? "管理服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured.",
    forbidden: isZh ? "你目前沒有管理員權限。" : "Admin access required.",
    deleteSelfForbidden: isZh ? "不可刪除目前登入的管理員帳號。" : "You cannot delete your own admin account.",
    deleteFailed: isZh ? "刪除用戶失敗，請稍後再試。" : "Failed to delete user.",
  };

  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: t.csrfFailed }, { status: 403 });
  }

  const [{ id }, access] = await Promise.all([
    context.params,
    assertAdminAccess(),
  ]);

  if ("error" in access && access.error) {
    const status = access.error.status;
    return NextResponse.json({ error: status === 503 ? t.serviceUnavailable : t.forbidden }, { status });
  }

  if (access.viewerId && access.viewerId === id) {
    return NextResponse.json({ error: t.deleteSelfForbidden }, { status: 400 });
  }

  const { error } = await access.admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: t.deleteFailed }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
