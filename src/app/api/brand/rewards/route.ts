import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
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

  const body = (await request.json()) as Partial<Database["public"]["Tables"]["rewards_catalog"]["Insert"]>;

  if (!body.slug || !body.name) {
    return NextResponse.json({ error: isZh ? "請填寫必要欄位：slug、name。" : "slug/name are required." }, { status: 400 });
  }

  const payload: Database["public"]["Tables"]["rewards_catalog"]["Insert"] = {
    slug: body.slug,
    name: body.name,
    cost: Number(body.cost ?? 0),
    badge: typeof body.badge === "string" ? body.badge : null,
    description: String(body.description ?? ""),
    fulfillment_eta: String(body.fulfillment_eta ?? "1-3 個工作天"),
    stock: typeof body.stock === "number" ? body.stock : null,
    is_active: body.is_active ?? true,
    display_order: Number(body.display_order ?? 0),
  };

  const { data, error } = await access.admin.from("rewards_catalog").insert(payload).select("slug").single();

  if (error) {
    return NextResponse.json({ error: isZh ? "儲存獎賞失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ slug: data?.slug }, { status: 201 });
}
