import { mobileConfig } from "./config";

export const API_BASE_URL = mobileConfig.apiBaseUrl;

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_INITIAL_RETRY_DELAY_MS = 400;

type RequestJsonOptions = {
  timeoutMs?: number;
  retries?: number;
  retryOnStatuses?: number[];
  initialRetryDelayMs?: number;
};

type PostJsonOptions = RequestJsonOptions & {
  headers?: HeadersInit;
};

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

  if (status === 409) {
    return "A duplicate request is already being processed. Please wait a moment and try again.";
  }

  if (status === 429) {
    return "Too many requests. Slow down and retry shortly.";
  }

  if (status >= 500) {
    return "Server error. Please try again shortly.";
  }

  return `Request failed (${status})`;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryAfterMs(response: Response) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isNaN(retryAfter) || retryAfter <= 0) {
    return null;
  }

  return retryAfter * 1000;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options?: RequestJsonOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? 0;
  const retryOnStatuses = options?.retryOnStatuses ?? [];
  const initialRetryDelayMs = options?.initialRetryDelayMs ?? DEFAULT_INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const shouldRetryStatus = retryOnStatuses.includes(response.status) && attempt < retries;
        if (shouldRetryStatus) {
          const headerDelay = getRetryAfterMs(response);
          const backoffDelay = initialRetryDelayMs * 2 ** attempt;
          await sleep(Math.max(backoffDelay, headerDelay ?? 0));
          continue;
        }

        throw new ApiRequestError(getErrorMessage(response.status), response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError || isAbort;
      const shouldRetry = attempt < retries && isNetworkError;

      if (shouldRetry) {
        const backoffDelay = initialRetryDelayMs * 2 ** attempt;
        await sleep(backoffDelay);
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
    { retries: 1, initialRetryDelayMs: DEFAULT_INITIAL_RETRY_DELAY_MS },
  );
}

export async function postJson<T>(
  path: string,
  payload: unknown,
  token?: string,
  options?: PostJsonOptions,
): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    body: JSON.stringify(payload),
  }, options);
}
