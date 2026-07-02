import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentViewer } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const locale = await getCurrentLocale();
  const viewer = await getCurrentViewer();
  await searchParams;

  if (viewer.user) {
    redirect("/dashboard");
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <AuthForm mode="register" locale={locale} />
    </section>
  );
}
