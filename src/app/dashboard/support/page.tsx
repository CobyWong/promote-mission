import Link from "next/link";
import { redirect } from "next/navigation";

import { SupportContactForm } from "@/components/support-contact-form";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getSupportEmail, getSupportWhatsappUrl } from "@/lib/supabase/env";

export default async function DashboardSupportPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getDashboardData();

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/support");
  }

  const t = locale === "en"
    ? { title: "Support Center", back: "Back" }
    : { title: "客服中心", back: "返回" };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-100">{t.title}</h1>

      <div className="mt-6">
        <SupportContactForm
          locale={locale}
          defaultEmail={dashboard.mode === "live" ? (dashboard.userEmail ?? "") : ""}
          supportEmail={getSupportEmail()}
          supportWhatsappUrl={getSupportWhatsappUrl()}
        />
      </div>
    </section>
  );
}
