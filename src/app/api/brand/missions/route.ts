import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertBrandAccess() {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return { error: NextResponse.json({ error: "Supabase brand mode is not configured." }, { status: 503 }) };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isBrandOrAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: "Brand/admin access required." }, { status: 403 }) };
  }

  return { admin };
}

export async function GET() {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const { data, error } = await access.admin
    .from("missions")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const missions = (data ?? []).map((item) => ({
    slug: item.slug,
    title: item.title,
    brand: item.brand,
    product: item.product,
    points: item.reward_coins,
    difficulty: item.difficulty,
    eta: item.eta,
    category: item.category,
    description: item.description,
    hook: item.hook,
    requirements: item.requirements,
    deliverables: item.deliverables,
    tags: item.tags,
    displayOrder: item.display_order,
    isActive: item.is_active,
  }));

  return NextResponse.json({ missions });
}

export async function POST(request: Request) {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json()) as Partial<Database["public"]["Tables"]["missions"]["Insert"]>;

  if (!body.slug || !body.title || !body.brand || !body.product) {
    return NextResponse.json({ error: "slug/title/brand/product are required." }, { status: 400 });
  }

  const payload: Database["public"]["Tables"]["missions"]["Insert"] = {
    slug: body.slug,
    title: body.title,
    brand: body.brand,
    product: body.product,
    reward_coins: Number(body.reward_coins ?? 0),
    difficulty: String(body.difficulty ?? "Easy"),
    eta: String(body.eta ?? "1 day"),
    category: String(body.category ?? "General"),
    description: String(body.description ?? ""),
    hook: String(body.hook ?? ""),
    requirements: Array.isArray(body.requirements) ? body.requirements : [],
    deliverables: Array.isArray(body.deliverables) ? body.deliverables : [],
    tags: Array.isArray(body.tags) ? body.tags : [],
    is_active: body.is_active ?? true,
    display_order: Number(body.display_order ?? 0),
  };

  const { data, error } = await access.admin.from("missions").insert(payload).select("slug").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ slug: data?.slug }, { status: 201 });
}
