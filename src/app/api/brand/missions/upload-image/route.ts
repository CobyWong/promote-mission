import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

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

export async function POST(request: Request) {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Please provide an image file." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const slug = String(formData.get("slug") ?? "").trim() || "mission";
  const safeSlug = sanitizeFileName(slug.toLowerCase());
  const path = `${safeSlug}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await access.admin.storage
    .from("mission-product-images")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = access.admin.storage.from("mission-product-images").getPublicUrl(path);

  return NextResponse.json({ imageUrl: data.publicUrl, path }, { status: 201 });
}
