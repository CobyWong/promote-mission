import { SupportContactForm } from "@/components/support-contact-form";
import { getCurrentViewer } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getSupportEmail, getSupportWhatsappUrl } from "@/lib/supabase/env";

export default async function SupportPage() {
  const [locale, viewer] = await Promise.all([getCurrentLocale(), getCurrentViewer()]);

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          {locale === "en" ? "Customer Support" : "客服中心"}
        </p>
      </div>

      <div className="mt-6 max-w-3xl">
        <SupportContactForm
          locale={locale}
          defaultEmail={viewer.user?.email ?? ""}
          supportEmail={getSupportEmail()}
          supportWhatsappUrl={getSupportWhatsappUrl()}
        />
      </div>
    </section>
  );
}
