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
  const body = (await request.json()) as Partial<Database["public"]["Tables"]["rewards_catalog"]["Update"]>;

  const payload: Database["public"]["Tables"]["rewards_catalog"]["Update"] = {
    name: typeof body.name === "string" ? body.name : undefined,
    cost: typeof body.cost === "number" ? body.cost : undefined,
    badge: typeof body.badge === "string" ? body.badge : body.badge === null ? null : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    fulfillment_eta: typeof body.fulfillment_eta === "string" ? body.fulfillment_eta : undefined,
    stock: typeof body.stock === "number" ? body.stock : body.stock === null ? null : undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    display_order: typeof body.display_order === "number" ? body.display_order : undefined,
  };

  const { error } = await access.admin.from("rewards_catalog").update(payload).eq("slug", slug);

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

  const { error } = await access.admin.from("rewards_catalog").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
