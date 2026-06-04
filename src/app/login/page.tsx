import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentViewer } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const locale = await getCurrentLocale();
  const viewer = await getCurrentViewer();
  const resolvedSearchParams = await searchParams;
  const requestedNextPath = resolvedSearchParams.next;
  const nextPath = requestedNextPath?.startsWith("/")
    && requestedNextPath !== "/login"
    && requestedNextPath !== "/register"
    && requestedNextPath !== "/admin/login"
    ? requestedNextPath
    : "/dashboard";

  if (viewer.user) {
    redirect(nextPath);
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <AuthForm mode="login" nextPath={nextPath} locale={locale} />
    </section>
  );
}
