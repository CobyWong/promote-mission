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

export type ApiRequestErrorCode =
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK"
  | "HTTP_ERROR"
  | "UNKNOWN";

type ApiRequestErrorOptions = {
  status?: number;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  code?: ApiRequestErrorCode;
  path?: string;
  method?: string;
  attempt?: number;
  maxAttempts?: number;
  retryable?: boolean;
  retryDelaysMs?: number[];
  requestId?: string | null;
};

export class ApiRequestError extends Error {
  status: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  code: ApiRequestErrorCode;
  path: string;
  method: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  retryDelaysMs: number[];
  requestId: string | null;

  constructor(message: string, options?: ApiRequestErrorOptions) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status ?? 0;
    this.isNetworkError = options?.isNetworkError ?? false;
    this.isTimeout = options?.isTimeout ?? false;
    this.code = options?.code ?? "UNKNOWN";
    this.path = options?.path ?? "";
    this.method = options?.method ?? "GET";
    this.attempt = options?.attempt ?? 1;
    this.maxAttempts = options?.maxAttempts ?? 1;
    this.retryable = options?.retryable ?? false;
    this.retryDelaysMs = options?.retryDelaysMs ?? [];
    this.requestId = options?.requestId ?? null;
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

function getErrorCodeFromStatus(status: number): ApiRequestErrorCode {
  if (status === 401) {
    return "UNAUTHORIZED";
  }

  if (status === 409) {
    return "CONFLICT";
  }

  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status >= 500) {
    return "SERVER_ERROR";
  }

  if (status >= 400) {
    return "HTTP_ERROR";
  }

  return "UNKNOWN";
}

function isRetryableStatus(status: number) {
  return status === 409 || status === 429 || status >= 500;
}

async function extractErrorMessage(response: Response) {
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      const errorMessage = typeof payload?.error === "string" ? payload.error.trim() : "";
      if (errorMessage) {
        return errorMessage;
      }

      const message = typeof payload?.message === "string" ? payload.message.trim() : "";
      if (message) {
        return message;
      }
    } catch {
      // Fallback to generic message when response body cannot be parsed.
    }
  }

  try {
    const text = (await response.text()).trim();
    if (text) {
      return text;
    }
  } catch {
    // Ignore body parse failure and fall back to generic status message.
  }

  return null;
}

export function getUserFacingApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    return error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
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
  const method = (init.method ?? "GET").toUpperCase();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options?.retries ?? 0;
  const retryOnStatuses = options?.retryOnStatuses ?? [];
  const initialRetryDelayMs = options?.initialRetryDelayMs ?? DEFAULT_INITIAL_RETRY_DELAY_MS;
  const maxAttempts = retries + 1;
  const retryDelaysMs: number[] = [];

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
          const retryDelay = Math.max(backoffDelay, headerDelay ?? 0);
          retryDelaysMs.push(retryDelay);
          await sleep(retryDelay);
          continue;
        }

        const serverMessage = await extractErrorMessage(response);
        const status = response.status;
        const requestId = response.headers.get("x-request-id");

        throw new ApiRequestError(serverMessage ?? getErrorMessage(status), {
          status,
          code: getErrorCodeFromStatus(status),
          path,
          method,
          attempt: attempt + 1,
          maxAttempts,
          retryable: isRetryableStatus(status),
          retryDelaysMs,
          requestId,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError || isAbort;
      const shouldRetry = attempt < retries && isNetworkError;

      if (shouldRetry) {
        const backoffDelay = initialRetryDelayMs * 2 ** attempt;
        retryDelaysMs.push(backoffDelay);
        await sleep(backoffDelay);
        continue;
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      throw new ApiRequestError(
        isAbort ? "Request timed out. Check your connection and try again." : "Network request failed.",
        {
          status: 0,
          isNetworkError: true,
          isTimeout: isAbort,
          code: isAbort ? "TIMEOUT" : "NETWORK",
          path,
          method,
          attempt: attempt + 1,
          maxAttempts,
          retryable: true,
          retryDelaysMs,
        },
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ApiRequestError("Unexpected request state.", {
    code: "UNKNOWN",
    path,
    method,
    attempt: maxAttempts,
    maxAttempts,
    retryable: false,
    retryDelaysMs,
  });
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
