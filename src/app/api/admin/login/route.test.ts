import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockIsAdminCredential,
  mockHasAdminCredentialConfig,
  mockEvaluateRateLimit,
  mockLogApiEvent,
  mockReportApiError,
} = vi.hoisted(() => ({
  mockIsAdminCredential: vi.fn(),
  mockHasAdminCredentialConfig: vi.fn(),
  mockEvaluateRateLimit: vi.fn(),
  mockLogApiEvent: vi.fn(),
  mockReportApiError: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  ADMIN_SESSION_COOKIE: "pm_admin_session",
  getAdminSessionCookieValue: () => "active",
  isAdminCredential: mockIsAdminCredential,
  hasAdminCredentialConfig: mockHasAdminCredentialConfig,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientFingerprint: () => "fingerprint",
  evaluateRateLimit: mockEvaluateRateLimit,
  getRetryAfterSeconds: () => 42,
}));

vi.mock("@/lib/observability", () => ({
  logApiEvent: mockLogApiEvent,
  reportApiError: mockReportApiError,
}));

import { POST } from "./route";

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasAdminCredentialConfig.mockReturnValue(true);
    mockEvaluateRateLimit.mockReturnValue({ allowed: true, remaining: 7, resetAt: Date.now() + 60_000 });
    mockIsAdminCredential.mockReturnValue(true);
    mockLogApiEvent.mockResolvedValue(undefined);
    mockReportApiError.mockResolvedValue(undefined);
  });

  it("returns 503 when admin credentials are not configured", async () => {
    mockHasAdminCredentialConfig.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
    }));

    expect(response.status).toBe(503);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockEvaluateRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("returns 401 for invalid credentials", async () => {
    mockIsAdminCredential.mockReturnValue(false);

    const response = await POST(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "wrong" }),
    }));

    expect(response.status).toBe(401);
  });

  it("sets admin cookie on success", async () => {
    const response = await POST(new Request("http://localhost/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "correct-password" }),
    }));

    expect(response.status).toBe(200);
    const cookieHeader = response.headers.get("set-cookie") ?? "";
    expect(cookieHeader).toContain("pm_admin_session=active");
  });
});
