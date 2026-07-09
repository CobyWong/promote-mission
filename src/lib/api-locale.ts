export function isZhRequest(request: Request) {
  const cookie = (request.headers.get("cookie") ?? "").toLowerCase();
  if (cookie.includes("locale=zh-hk") || cookie.includes("next_locale=zh-hk")) {
    return true;
  }

  const acceptLanguage = (request.headers.get("accept-language") ?? "").toLowerCase();
  return acceptLanguage.includes("zh");
}
