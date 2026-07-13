import Link from "next/link";
import { redirect } from "next/navigation";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function DashboardSettingsPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getDashboardData();

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/settings");
  }

  const t = locale === "en"
    ? {
      title: "Settings",
      back: "Back",
      subtitle: "Manage language and account preferences.",
      languageTitle: "Language",
      languageHint: "Apply language changes across the app instantly.",
      accountTitle: "Account",
      signOut: "Sign out",
      support: "Support center",
      privacy: "Privacy policy",
      terms: "Terms of service",
    }
    : {
      title: "設定",
      back: "返回",
      subtitle: "集中管理語言與帳戶偏好。",
      languageTitle: "語言",
      languageHint: "即時套用全站語言設定。",
      accountTitle: "帳戶",
      signOut: "登出",
      support: "客服中心",
      privacy: "私隱政策",
      terms: "服務條款",
    };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-slate-100">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.subtitle}</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-slate-100">{t.languageTitle}</p>
          <p className="mt-1 text-xs text-slate-400">{t.languageHint}</p>
          <div className="mt-3">
            <LanguageSwitcher locale={locale} />
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.accountTitle}</p>
          <div className="mt-3 divide-y divide-white/10">
            <Link href="/dashboard/support" className="flex items-center justify-between gap-3 rounded-xl px-1 py-3 text-slate-200 transition hover:bg-white/5">
              <p className="text-lg font-medium text-slate-100">{t.support}</p>
              <span className="text-2xl leading-none text-slate-400">›</span>
            </Link>
            <Link href="/privacy" className="flex items-center justify-between gap-3 rounded-xl px-1 py-3 text-slate-200 transition hover:bg-white/5">
              <p className="text-lg font-medium text-slate-100">{t.privacy}</p>
              <span className="text-2xl leading-none text-slate-400">›</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between gap-3 rounded-xl px-1 py-3 text-slate-200 transition hover:bg-white/5">
              <p className="text-lg font-medium text-slate-100">{t.terms}</p>
              <span className="text-2xl leading-none text-slate-400">›</span>
            </Link>
          </div>

          <div className="mt-5">
            <SignOutButton
              label={t.signOut}
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
