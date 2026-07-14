import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentLocale } from "@/lib/i18n";
import { hasAdminSession } from "@/lib/admin-session";

function sanitizeNextPath(raw: string | undefined, fallback = "/admin/reviews") {
  if (!raw) {
    return fallback;
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw === "/admin/login") {
    return fallback;
  }

  return raw;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const locale = await getCurrentLocale();
  const hasSession = await hasAdminSession();
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams.next);

  if (hasSession) {
    redirect(nextPath);
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <AdminLoginForm locale={locale} nextPath={nextPath} />
    </section>
  );
}
