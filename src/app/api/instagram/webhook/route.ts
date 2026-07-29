import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const VERIFY_MODE = "subscribe";

function getVerifyToken() {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() ?? "";
}

function getWebhookSecret() {
  return process.env.INSTAGRAM_WEBHOOK_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || "";
}

function parseSignatureHeader(rawHeader: string | null) {
  if (!rawHeader) {
    return null;
  }

  const match = rawHeader.match(/^sha256=([a-f0-9]{64})$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function safelyCompareHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
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
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json({ error: "INSTAGRAM_WEBHOOK_APP_SECRET (or META_APP_SECRET) is not configured." }, { status: 500 });
  }

  const signature = parseSignatureHeader(request.headers.get("x-hub-signature-256"));
  if (!signature) {
    return NextResponse.json({ error: "Missing or invalid webhook signature header." }, { status: 401 });
  }

  const rawPayload = await request.text();
  const expectedSignature = signPayload(rawPayload, webhookSecret);

  if (!safelyCompareHex(signature, expectedSignature)) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 401 });
  }

  const parsedPayload = (() => {
    try {
      return rawPayload ? JSON.parse(rawPayload) : null;
    } catch {
      return null;
    }
  })();
  if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  // Keep 200 so Meta delivery checks pass after signature verification.
  return NextResponse.json({ received: true }, { status: 200 });
}
