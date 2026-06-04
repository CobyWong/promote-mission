import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { ADMIN_SESSION_COOKIE, hasAdminSessionCookieValue } from "@/lib/admin-auth";
import { updateSession } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig, isAdminEmail, isBrandOrAdminEmail } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isAdminLogin = pathname === "/admin/login";
  const isAdminAuthApi = pathname === "/api/admin/login" || pathname === "/api/admin/logout";
  const isProtectedAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/brand") || pathname.startsWith("/api/admin") || pathname.startsWith("/api/brand");

  if (!isProtectedAdminRoute || isAdminLogin || isAdminAuthApi) {
    return response;
  }

  const hasAdminSession = hasAdminSessionCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (hasAdminSession) {
    return response;
  }

  if (hasSupabaseConfig()) {
    const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const allowBrandRoute = (pathname.startsWith("/brand") || pathname.startsWith("/api/brand")) && isBrandOrAdminEmail(user.email);
      const allowAdminRoute = (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && isAdminEmail(user.email);

      if (allowBrandRoute || allowAdminRoute) {
        return response;
      }
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
