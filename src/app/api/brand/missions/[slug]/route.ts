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

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;
  const body = (await request.json()) as Partial<Database["public"]["Tables"]["missions"]["Update"]>;

  const payload: Database["public"]["Tables"]["missions"]["Update"] = {
    title: typeof body.title === "string" ? body.title : undefined,
    brand: typeof body.brand === "string" ? body.brand : undefined,
    product: typeof body.product === "string" ? body.product : undefined,
    mission_image_url: typeof body.mission_image_url === "string" ? body.mission_image_url : undefined,
    reward_coins: typeof body.reward_coins === "number" ? body.reward_coins : undefined,
    difficulty: typeof body.difficulty === "string" ? body.difficulty : undefined,
    eta: typeof body.eta === "string" ? body.eta : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    hook: typeof body.hook === "string" ? body.hook : undefined,
    requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
    deliverables: Array.isArray(body.deliverables) ? body.deliverables : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    display_order: typeof body.display_order === "number" ? body.display_order : undefined,
    min_participants: typeof body.min_participants === "number" ? body.min_participants : undefined,
    current_participants: typeof body.current_participants === "number" ? body.current_participants : undefined,
  };

  const { error } = await access.admin.from("missions").update(payload).eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;

  const { error } = await access.admin.from("missions").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
