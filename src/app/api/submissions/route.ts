import { NextResponse } from "next/server";

import { missions } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in before submitting proof." }, { status: 401 });
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "");
  const reelUrl = String(formData.get("reelUrl") ?? "").trim();
  const captionSummary = String(formData.get("captionSummary") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const checksRaw = String(formData.get("checks") ?? "{}");
  const checks = JSON.parse(checksRaw) as Record<string, boolean>;
  const files = formData
    .getAll("screenshots")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const { data: missionRow } = await supabase
    .from("missions")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const mission = missionRow
    ? {
        slug: missionRow.slug,
        title: missionRow.title,
        brand: missionRow.brand,
        points: missionRow.reward_coins,
      }
    : missions.find((item) => item.slug === slug);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found." }, { status: 404 });
  }

  if (!reelUrl.startsWith("http")) {
    return NextResponse.json({ error: "A valid reel URL is required." }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Please upload at least one screenshot." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, instagram_handle")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = (profile ?? null) as Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "full_name" | "instagram_handle"
  > | null;

  const uploadedPaths: string[] = [];

  for (const [index, file] of files.entries()) {
    const arrayBuffer = await file.arrayBuffer();
    const path = `${user.id}/${Date.now()}-${index}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await admin.storage
      .from("mission screenshot")
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    uploadedPaths.push(path);
  }

  const submissionPayload: Database["public"]["Tables"]["submissions"]["Insert"] = {
    user_id: user.id,
    mission_slug: mission.slug,
    mission_title: mission.title,
    mission_brand: mission.brand,
    reward_coins: mission.points,
    reel_url: reelUrl,
    caption_summary: captionSummary,
    notes,
    checklist: checks,
    screenshot_count: uploadedPaths.length,
    screenshot_paths: uploadedPaths,
    creator_name: profileRow?.full_name ?? user.email ?? "Creator",
    creator_handle: profileRow?.instagram_handle ?? null,
    status: "Pending",
  };

  const { data, error } = await supabase
    .from("submissions")
    .insert(submissionPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
