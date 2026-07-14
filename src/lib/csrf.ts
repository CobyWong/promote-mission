export function isSameOriginMutationRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  // Allow non-browser callers that do not send Origin/Referer.
  if (!originHeader && !refererHeader) {
    return true;
  }

  const candidate = originHeader ?? refererHeader;
  if (!candidate) {
    return false;
  }

  try {
    return new URL(candidate).origin === requestOrigin;
  } catch {
    return false;
  }
}
