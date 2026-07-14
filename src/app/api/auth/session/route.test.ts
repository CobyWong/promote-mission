import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEvaluateRateLimit,
  mockLogApiEvent,
  mockReportApiError,
  mockSetSession,
} = vi.hoisted(() => ({
  mockEvaluateRateLimit: vi.fn(),
  mockLogApiEvent: vi.fn(),
  mockReportApiError: vi.fn(),
  mockSetSession: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientFingerprint: () => "fingerprint",
  evaluateRateLimit: mockEvaluateRateLimit,
  getRetryAfterSeconds: () => 21,
}));

vi.mock("@/lib/observability", () => ({
  logApiEvent: mockLogApiEvent,
  reportApiError: mockReportApiError,
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: () => true,
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabaseAnonKey: () => "anon-key",
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      setSession: mockSetSession,
    },
  }),
}));

import { POST } from "./route";

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateRateLimit.mockReturnValue({ allowed: true, remaining: 29, resetAt: Date.now() + 60_000 });
    mockSetSession.mockResolvedValue({ error: null });
    mockLogApiEvent.mockResolvedValue(undefined);
    mockReportApiError.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockEvaluateRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ access_token: "a", refresh_token: "b" }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("21");
  });

  it("returns 403 when origin does not match", async () => {
    const response = await POST(new Request("http://localhost/api/auth/session", {
      method: "POST",
      headers: {
        origin: "http://evil.localhost",
      },
      body: JSON.stringify({ access_token: "a", refresh_token: "b" }),
    }));

    expect(response.status).toBe(403);
  });

  it("returns 400 when tokens are missing", async () => {
    const response = await POST(new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ access_token: "" }),
    }));

    expect(response.status).toBe(400);
  });

  it("returns 401 when setSession fails", async () => {
    mockSetSession.mockResolvedValue({ error: { message: "invalid token" } });

    const response = await POST(new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ access_token: "a", refresh_token: "b" }),
    }));

    expect(response.status).toBe(401);
  });

  it("returns 200 when session is set", async () => {
    const response = await POST(new Request("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ access_token: "a", refresh_token: "b" }),
    }));

    expect(response.status).toBe(200);
    expect(mockSetSession).toHaveBeenCalled();
  });
});
