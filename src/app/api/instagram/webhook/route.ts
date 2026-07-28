import { NextResponse } from "next/server";

const VERIFY_MODE = "subscribe";

function getVerifyToken() {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("hub.mode");
  const token = requestUrl.searchParams.get("hub.verify_token");
  const challenge = requestUrl.searchParams.get("hub.challenge");

  const configuredToken = getVerifyToken();

  if (!configuredToken) {
    return NextResponse.json({ error: "INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured." }, { status: 500 });
  }

  if (mode === VERIFY_MODE && token === configuredToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  // Placeholder endpoint: keep 200 so Meta delivery checks pass.
  return NextResponse.json({ received: true, payload }, { status: 200 });
}
