import { mobileConfig } from "./config";

type TelemetryLevel = "info" | "warn" | "error";
type TelemetryEventType = "error" | "performance" | "api_error";

type TelemetryPayload = {
  eventType: TelemetryEventType;
  scope: string;
  timestamp: string;
  appEnvironment: string;
  level: TelemetryLevel;
  message?: string;
  context?: Record<string, unknown>;
};

type ApiErrorDiagnostics = {
  code: string;
  status: number;
  path: string;
  method: string;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  retryDelaysMs: number[];
  requestId: string | null;
};

let globalHandlerInstalled = false;

function shouldSample(sampleRate: number) {
  return sampleRate >= 1 || (sampleRate > 0 && Math.random() <= sampleRate);
}

function buildPayload(input: TelemetryPayload) {
  return {
    ...input,
    deviceTimeMs: Date.now(),
  };
}

async function postTelemetry(payload: TelemetryPayload) {
  if (!mobileConfig.telemetryEnabled) {
    return;
  }

  const endpoint = mobileConfig.telemetryEndpoint;
  if (!endpoint) {
    if (mobileConfig.appEnvironment !== "production") {
      console.info("[telemetry]", payload);
    }
    return;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(payload)),
    });
  } catch {
    // Telemetry should never break app behavior.
  }
}

export function trackAppError(scope: string, error: unknown, context?: Record<string, unknown>) {
  if (!mobileConfig.telemetryEnabled || !shouldSample(mobileConfig.telemetryErrorSampleRate)) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const stack = error instanceof Error ? error.stack ?? null : null;

  void postTelemetry({
    eventType: "error",
    scope,
    timestamp: new Date().toISOString(),
    appEnvironment: mobileConfig.appEnvironment,
    level: "error",
    message,
    context: {
      ...context,
      stack,
    },
  });
}

export function trackApiError(scope: string, diagnostics: ApiErrorDiagnostics, message: string) {
  if (!mobileConfig.telemetryEnabled || !shouldSample(mobileConfig.telemetryErrorSampleRate)) {
    return;
  }

  void postTelemetry({
    eventType: "api_error",
    scope,
    timestamp: new Date().toISOString(),
    appEnvironment: mobileConfig.appEnvironment,
    level: "warn",
    message,
    context: diagnostics,
  });
}

export function trackPerformance(scope: string, durationMs: number, context?: Record<string, unknown>) {
  if (!mobileConfig.telemetryEnabled || !shouldSample(mobileConfig.telemetryPerfSampleRate)) {
    return;
  }

  void postTelemetry({
    eventType: "performance",
    scope,
    timestamp: new Date().toISOString(),
    appEnvironment: mobileConfig.appEnvironment,
    level: "info",
    context: {
      durationMs,
      ...context,
    },
  });
}

export function installGlobalErrorHandler() {
  if (globalHandlerInstalled) {
    return;
  }

  const maybeErrorUtils = (globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  }).ErrorUtils;

  const getGlobalHandler = maybeErrorUtils?.getGlobalHandler;
  const setGlobalHandler = maybeErrorUtils?.setGlobalHandler;

  if (!getGlobalHandler || !setGlobalHandler) {
    return;
  }

  const existingHandler = getGlobalHandler();
  setGlobalHandler((error, isFatal) => {
    trackAppError("global-error-handler", error, { isFatal: Boolean(isFatal) });
    existingHandler(error, isFatal);
  });

  globalHandlerInstalled = true;
}
