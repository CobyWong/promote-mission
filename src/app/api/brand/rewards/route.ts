import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { getRewardRequiredCoins } from "@/lib/reward-pricing";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertBrandAccess(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return { error: NextResponse.json({ error: isZh ? "品牌管理服務暫時不可用，請稍後再試。" : "Supabase brand mode is not configured." }, { status: 503 }) };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isBrandOrAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: isZh ? "你目前沒有品牌或管理員權限。" : "Brand/admin access required." }, { status: 403 }) };
  }

  return { admin };
}

function parseNonNegativeInteger(value: unknown, fallback: number | null = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { data, error } = await access.admin
    .from("rewards_catalog")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: isZh ? "載入獎賞清單失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  const rewards = (data ?? []).map((item) => ({
    slug: item.slug,
    name: item.name,
    cost: item.cost,
    badge: item.badge ?? undefined,
    description: item.description,
    eta: item.fulfillment_eta,
    stock: item.stock,
    displayOrder: item.display_order,
    isActive: item.is_active,
  }));

  return NextResponse.json({ rewards });
}

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json().catch(() => null)) as Partial<Database["public"]["Tables"]["rewards_catalog"]["Insert"]> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: isZh ? "請求內容格式無效。" : "Invalid payload." }, { status: 400 });
  }

  if (!body.slug || !body.name) {
    return NextResponse.json({ error: isZh ? "請填寫必要欄位：slug、name。" : "slug/name are required." }, { status: 400 });
  }

  const fallbackCost = parseNonNegativeInteger(body.cost, 0);
  const displayOrder = parseNonNegativeInteger(body.display_order, 0);
  const stock = body.stock === null ? null : parseNonNegativeInteger(body.stock, null);

  if (fallbackCost === null || displayOrder === null || (body.stock !== undefined && stock === null)) {
    return NextResponse.json(
      {
        error: isZh
          ? "cost、display_order、stock 必須為非負整數。"
          : "cost, display_order, and stock must be non-negative integers.",
      },
      { status: 400 },
    );
  }

  const computedCost = getRewardRequiredCoins({
    name: body.name,
    slug: body.slug,
    fallbackCost,
  }) ?? fallbackCost;

  if (!Number.isFinite(computedCost) || !Number.isInteger(computedCost) || computedCost < 0) {
    return NextResponse.json(
      {
        error: isZh
          ? "reward cost 計算結果無效，請檢查輸入資料。"
          : "Computed reward cost is invalid. Please verify input values.",
      },
      { status: 400 },
    );
  }

  const payload: Database["public"]["Tables"]["rewards_catalog"]["Insert"] = {
    slug: body.slug,
    name: body.name,
    cost: computedCost,
    badge: typeof body.badge === "string" ? body.badge : null,
    description: String(body.description ?? ""),
    fulfillment_eta: String(body.fulfillment_eta ?? "1-3 個工作天"),
    stock,
    is_active: body.is_active ?? true,
    display_order: displayOrder,
  };

  const { data, error } = await access.admin.from("rewards_catalog").insert(payload).select("slug").single();

  if (error) {
    return NextResponse.json({ error: isZh ? "儲存獎賞失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ slug: data?.slug }, { status: 201 });
}
