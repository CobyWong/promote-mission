"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";

type HeaderSideMenuProps = {
  locale: Locale;
  theme: Theme;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

export function HeaderSideMenu({ locale, theme, isAuthenticated, isAdmin }: HeaderSideMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (!details || !details.open) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !details.contains(target)) {
        details.open = false;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const details = detailsRef.current;
      if (details?.open) {
        details.open = false;
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const links = locale === "en"
    ? {
      menu: "Menu",
      missions: "Missions",
      rewards: "Rewards",
      dashboard: "Dashboard",
      login: "Login",
      register: "Get Started",
      adminReview: "Admin Review",
      adminRedemptions: "Admin Fulfillment",
      adminUsers: "User Management",
      brandMissions: "Brand Missions",
      brandRewards: "Brand Rewards",
      leaderboard: "Leaderboard",
      signOut: "Sign out",
    }
    : {
      menu: "選單",
      missions: "任務中心",
      rewards: "獎賞商城",
      dashboard: "面板",
      login: "登入",
      register: "免費開始",
      adminReview: "審核後台",
      adminRedemptions: "兌換處理",
      adminUsers: "用戶管理",
      brandMissions: "品牌任務管理",
      brandRewards: "品牌獎賞管理",
      leaderboard: "排行榜",
      signOut: "登出",
    };

  const panelBg = theme === "dark" ? "bg-slate-950 border-white/20" : "bg-white border-cyan-500";
  const textMain = theme === "dark" ? "text-white" : "text-slate-900";
  const textSub = theme === "dark" ? "text-slate-300" : "text-slate-600";

  return (
    <details ref={detailsRef} className="relative z-[80]">
      <summary
        aria-label={links.menu}
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${theme === "dark"
          ? "border-white/20 text-white hover:border-white/40"
          : "border-slate-300 text-slate-700 hover:border-slate-400"
          } list-none cursor-pointer [&::-webkit-details-marker]:hidden`}
      >
        {links.menu}
      </summary>

      <aside
        id="header-side-menu"
        className={`absolute right-0 mt-3 w-[22rem] max-w-[92vw] rounded-3xl border-2 p-6 shadow-2xl ${panelBg}`}
        role="dialog"
        aria-label={links.menu}
      >
        <div className="flex max-h-[70vh] flex-col">
          <h2 className={`text-lg font-semibold ${textMain}`}>{links.menu}</h2>

          <div className="mt-6 flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <ThemeSwitcher theme={theme} />
          </div>

          <div className="mt-8 flex-1 space-y-3 overflow-y-auto pr-1">
            {isAuthenticated ? (
              <>
                <Link href="/missions" prefetch className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                  ? "border-white/10 text-slate-200 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                  {links.missions}
                </Link>
                <Link href="/rewards" prefetch className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                  ? "border-white/10 text-slate-200 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                  {links.rewards}
                </Link>
                <Link href="/leaderboard" prefetch className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                  ? "border-white/10 text-slate-200 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                  {links.leaderboard}
                </Link>
                {!isAdmin && (
                  <Link href="/dashboard" prefetch className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                    ? "border-white/10 text-slate-200 hover:bg-white/5"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}>
                    {links.dashboard}
                  </Link>
                )}

                {isAdmin ? (
                  <>
                    <Link href="/admin/reviews" className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                      ? "border-white/10 text-slate-200 hover:bg-white/5"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}>
                      {links.adminReview}
                    </Link>
                    <Link href="/admin/redemptions" className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                      ? "border-white/10 text-slate-200 hover:bg-white/5"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}>
                      {links.adminRedemptions}
                    </Link>
                    <Link href="/admin/users" className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                      ? "border-white/10 text-slate-200 hover:bg-white/5"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}>
                      {links.adminUsers}
                    </Link>
                    <Link href="/brand/missions" className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                      ? "border-white/10 text-slate-200 hover:bg-white/5"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}>
                      {links.brandMissions}
                    </Link>
                    <Link href="/brand/rewards" className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                      ? "border-white/10 text-slate-200 hover:bg-white/5"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}>
                      {links.brandRewards}
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Link href="/login" prefetch className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${theme === "dark"
                  ? "border-white/10 text-slate-200 hover:bg-white/5"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                  {links.login}
                </Link>
                <Link href="/register" prefetch className={`block rounded-full px-4 py-3 text-center text-sm font-semibold transition ${theme === "dark"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "bg-cyan-500 text-white hover:bg-cyan-600"
                  }`}>
                  {links.register}
                </Link>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <SignOutButton
                label={links.signOut}
                className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${theme === "dark"
                  ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  : "bg-cyan-500 text-white hover:bg-cyan-600"
                  }`}
              />
            </div>
          ) : null}

          <p className={`mt-6 text-xs ${textSub}`}>
            Promote Mission
          </p>
        </div>
      </aside>
    </details>
  );
}
