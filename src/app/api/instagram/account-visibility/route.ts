import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { fetchInstagramAccountProfile } from "@/lib/instagram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: isZh ? "Instagram 服務暫時不可用。" : "Instagram service is unavailable." },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入。" : "Please log in first." }, { status: 401 });
  }

  const { data: connectionData, error: connectionError } = await supabase
    .from("instagram_connections")
    .select("instagram_user_id, access_token, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json(
      { error: isZh ? "讀取 Instagram 連線失敗。" : connectionError.message },
      { status: 400 },
    );
  }

  if (!connectionData) {
    return NextResponse.json({ visibility: "not_connected" }, { status: 200 });
  }

  try {
    const profile = await fetchInstagramAccountProfile(connectionData.instagram_user_id, connectionData.access_token);
    if (profile.isPrivate === true) {
      return NextResponse.json({ visibility: "private" }, { status: 200 });
    }

    if (profile.isPrivate === false) {
      return NextResponse.json({ visibility: "public" }, { status: 200 });
    }

    return NextResponse.json({ visibility: "unknown" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        visibility: "unknown",
        error: error instanceof Error ? error.message : (isZh ? "讀取 Instagram 可見度失敗。" : "Failed to fetch Instagram visibility."),
      },
      { status: 200 },
    );
  }
}