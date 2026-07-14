import { describe, expect, it } from "vitest";

import { isSameOriginMutationRequest } from "@/lib/csrf";

describe("isSameOriginMutationRequest", () => {
  it("allows non-browser callers without origin headers", () => {
    const request = new Request("https://app.example.com/api/redemptions", {
      method: "POST",
      body: "{}",
    });

    expect(isSameOriginMutationRequest(request)).toBe(true);
  });

  it("allows same-origin Origin header", () => {
    const request = new Request("https://app.example.com/api/redemptions", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
      },
      body: "{}",
    });

    expect(isSameOriginMutationRequest(request)).toBe(true);
  });

  it("allows same-origin Referer header when Origin is absent", () => {
    const request = new Request("https://app.example.com/api/redemptions", {
      method: "POST",
      headers: {
        referer: "https://app.example.com/dashboard",
      },
      body: "{}",
    });

    expect(isSameOriginMutationRequest(request)).toBe(true);
  });

  it("rejects cross-origin Origin header", () => {
    const request = new Request("https://app.example.com/api/redemptions", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
      },
      body: "{}",
    });

    expect(isSameOriginMutationRequest(request)).toBe(false);
  });

  it("rejects malformed origin/referer values", () => {
    const request = new Request("https://app.example.com/api/redemptions", {
      method: "POST",
      headers: {
        origin: "not-a-url",
      },
      body: "{}",
    });

    expect(isSameOriginMutationRequest(request)).toBe(false);
  });
});
