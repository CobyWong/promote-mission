import { ResetPasswordForm } from "@/components/reset-password-form";
import { getCurrentLocale } from "@/lib/i18n";

export default async function ResetPasswordPage() {
  const locale = await getCurrentLocale();

  return (
    <section className="section-shell py-12 sm:py-16">
      <ResetPasswordForm locale={locale} />
    </section>
  );
}
