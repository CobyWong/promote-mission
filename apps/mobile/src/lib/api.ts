export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const DEFAULT_TIMEOUT_MS = 12000;

export class ApiRequestError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status = 0, isNetworkError = false) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

function getErrorMessage(status: number) {
  if (status === 401) {
    return "Session expired. Please sign in again.";
  }

  if (status >= 500) {
    return "Server error. Please try again shortly.";
  }

  return `Request failed (${status})`;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options?: { timeoutMs?: number; retries?: number },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ApiRequestError(getErrorMessage(response.status), response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError || isAbort;
      const shouldRetry = attempt < retries && isNetworkError;

      if (shouldRetry) {
        continue;
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      throw new ApiRequestError(
        isAbort ? "Request timed out. Check your connection and try again." : "Network request failed.",
        0,
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ApiRequestError("Unexpected request state.");
}

export async function fetchJson<T>(path: string, token?: string): Promise<T> {
  return requestJson<T>(
    path,
    {
      headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    },
    { retries: 1 },
  );
}

export async function postJson<T>(path: string, payload: unknown, token?: string): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}
