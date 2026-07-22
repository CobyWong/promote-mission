"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import type { Locale } from "@/lib/i18n";

type HeaderSideMenuProps = {
  locale: Locale;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

export function HeaderSideMenu({ locale, isAuthenticated, isAdmin }: HeaderSideMenuProps) {
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
      dashboard: "Profile",
      support: "Support",
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
      dashboard: "個人檔案",
      support: "客服中心",
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

  const panelBg = "bg-white border-slate-300";
  const textMain = "text-slate-900";
  const textSub = "text-slate-600";
  const menuLinkClass = "block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

  return (
    <details ref={detailsRef} className="relative z-[80]">
      <summary
        aria-label={links.menu}
        className="flex h-12 w-12 list-none cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-700 transition hover:border-slate-400 [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4.5 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.5 10h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M4.5 13.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="sr-only">{links.menu}</span>
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
          </div>

          <div className="mt-8 flex-1 space-y-3 overflow-y-auto pr-1">
            {isAuthenticated ? (
              <>
                <Link href="/missions" prefetch className={menuLinkClass}>
                  {links.missions}
                </Link>
                <Link href="/rewards" prefetch className={menuLinkClass}>
                  {links.rewards}
                </Link>
                <Link href="/leaderboard" prefetch className={menuLinkClass}>
                  {links.leaderboard}
                </Link>
                {!isAdmin && (
                  <Link href="/dashboard" prefetch className={menuLinkClass}>
                    {links.dashboard}
                  </Link>
                )}
                <Link href="/dashboard#support-center" prefetch className={menuLinkClass}>
                  {links.support}
                </Link>

                {isAdmin ? (
                  <>
                    <Link href="/admin/reviews" className={menuLinkClass}>
                      {links.adminReview}
                    </Link>
                    <Link href="/admin/redemptions" className={menuLinkClass}>
                      {links.adminRedemptions}
                    </Link>
                    <Link href="/admin/users" className={menuLinkClass}>
                      {links.adminUsers}
                    </Link>
                    <Link href="/brand/missions" className={menuLinkClass}>
                      {links.brandMissions}
                    </Link>
                    <Link href="/brand/rewards" className={menuLinkClass}>
                      {links.brandRewards}
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Link href="/login" prefetch className={menuLinkClass}>
                  {links.login}
                </Link>
                <Link href="/register" prefetch className="block rounded-full bg-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-cyan-600">
                  {links.register}
                </Link>
                <Link href="/dashboard#support-center" prefetch className={menuLinkClass}>
                  {links.support}
                </Link>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <SignOutButton
                label={links.signOut}
                className="w-full rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          ) : null}

          <p className={`mt-6 text-xs ${textSub}`}>
            Mission One
          </p>
        </div>
      </aside>
    </details>
  );
}
