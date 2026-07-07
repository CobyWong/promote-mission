import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockEvaluateRateLimit,
  mockLogApiEvent,
  mockReportApiError,
  mockGetUser,
} = vi.hoisted(() => ({
  mockEvaluateRateLimit: vi.fn(),
  mockLogApiEvent: vi.fn(),
  mockReportApiError: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseAdminConfig: () => true,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  evaluateRateLimit: mockEvaluateRateLimit,
  getClientFingerprint: () => "fingerprint",
  getRetryAfterSeconds: () => 18,
}));

vi.mock("@/lib/observability", () => ({
  logApiEvent: mockLogApiEvent,
  reportApiError: mockReportApiError,
}));

import { GET, POST } from "./route";

describe("/api/mobile/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateRateLimit.mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 });
    mockGetUser.mockResolvedValue({ data: { user: { id: "user_1" } }, error: null });
    mockLogApiEvent.mockResolvedValue(undefined);
    mockReportApiError.mockResolvedValue(undefined);
  });

  it("GET returns 401 when bearer token is missing", async () => {
    const response = await GET(new Request("http://localhost/api/mobile/submissions"));
    expect(response.status).toBe(401);
  });

  it("GET returns 400 for invalid cursor", async () => {
    const response = await GET(new Request("http://localhost/api/mobile/submissions?cursor=not-valid", {
      headers: {
        authorization: "Bearer token",
      },
    }));

    expect(response.status).toBe(400);
  });

  it("POST returns 429 when submission creation is rate-limited", async () => {
    mockEvaluateRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(new Request("http://localhost/api/mobile/submissions", {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        slug: "mission",
        reelUrl: "https://instagram.com/reel/123",
        checks: { addedCollaborator: true },
      }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("18");
  });
});
