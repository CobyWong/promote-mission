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

function parseOptionalNonNegativeInteger(value: unknown, allowNull = false) {
  if (value === undefined) {
    return { provided: false, value: undefined as number | null | undefined };
  }

  if (value === null && allowNull) {
    return { provided: true, value: null as number | null };
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.trim())
      : Number.NaN;

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return { provided: true, value: null as number | null };
  }

  return { provided: true, value: parsed };
}

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as Partial<Database["public"]["Tables"]["rewards_catalog"]["Update"]> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: isZh ? "請求內容格式無效。" : "Invalid payload." }, { status: 400 });
  }

  const fallbackCost = parseOptionalNonNegativeInteger(body.cost);
  const stock = parseOptionalNonNegativeInteger(body.stock, true);
  const displayOrder = parseOptionalNonNegativeInteger(body.display_order);

  if (
    (fallbackCost.provided && fallbackCost.value === null)
    || (displayOrder.provided && displayOrder.value === null)
    || (stock.provided && body.stock !== null && stock.value === null)
  ) {
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
    name: typeof body.name === "string" ? body.name : undefined,
    slug,
    fallbackCost: typeof fallbackCost.value === "number" ? fallbackCost.value : undefined,
  });

  if (computedCost !== undefined && (!Number.isFinite(computedCost) || !Number.isInteger(computedCost) || computedCost < 0)) {
    return NextResponse.json(
      {
        error: isZh
          ? "reward cost 計算結果無效，請檢查輸入資料。"
          : "Computed reward cost is invalid. Please verify input values.",
      },
      { status: 400 },
    );
  }

  const payload: Database["public"]["Tables"]["rewards_catalog"]["Update"] = {
    name: typeof body.name === "string" ? body.name : undefined,
    cost: computedCost,
    badge: typeof body.badge === "string" ? body.badge : body.badge === null ? null : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    fulfillment_eta: typeof body.fulfillment_eta === "string" ? body.fulfillment_eta : undefined,
    stock: stock.value,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    display_order: typeof displayOrder.value === "number" ? displayOrder.value : undefined,
  };

  const { error } = await access.admin.from("rewards_catalog").update(payload).eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: isZh ? "更新獎賞失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;

  const { error } = await access.admin.from("rewards_catalog").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: isZh ? "刪除獎賞失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
