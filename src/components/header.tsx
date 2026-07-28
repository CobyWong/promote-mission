import Link from "next/link";
import Image from "next/image";

import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";
import { isAdminEmail } from "@/lib/supabase/env";
import { hasAdminSession } from "@/lib/admin-session";
import { getCurrentViewer, getCurrentViewerLevelProgress } from "@/lib/backend";
import { HeaderMainNav } from "@/components/header-main-nav";
import { HeaderNotificationCenter } from "@/components/header-notification-center";
import { HeaderSideMenu } from "@/components/header-side-menu";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const linkLabels: Record<Locale, Record<string, string>> = {
  "zh-HK": {
    missions: "任務中心",
    rewards: "獎賞商城",
    leaderboard: "排行榜",
    dashboard: "個人檔案",
    support: "客服中心",
    adminReview: "審核後台",
    adminFulfillment: "兌換處理",
    adminUsers: "用戶管理",
    brandMissions: "品牌任務管理",
    brandRewards: "品牌獎賞管理",
    login: "登入",
    start: "免費開始",
    subtitle: "接任務・拍 Reels・換獎賞",
  },
  en: {
    missions: "Missions",
    rewards: "Rewards",
    leaderboard: "Leaderboard",
    dashboard: "Profile",
    support: "Support",
    adminReview: "Admin Review",
    adminFulfillment: "Admin Fulfillment",
    adminUsers: "User Management",
    brandMissions: "Brand Missions",
    brandRewards: "Brand Rewards",
    login: "Login",
    start: "Get Started",
    subtitle: "Take missions • Post Reels • Redeem rewards",
  },
};

const userLinks = [
  { href: "/missions", key: "missions" },
  { href: "/rewards", key: "rewards" },
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/dashboard", key: "dashboard" },
];

const adminLinks = [
  { href: "/admin/reviews", key: "adminReview" },
  { href: "/admin/redemptions", key: "adminFulfillment" },
  { href: "/admin/users", key: "adminUsers" },
  { href: "/brand/missions", key: "brandMissions" },
  { href: "/brand/rewards", key: "brandRewards" },
];

export async function Header() {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const [adminSession, viewer, viewerLevel] = await Promise.all([
    hasAdminSession(),
    getCurrentViewer(),
    getCurrentViewerLevelProgress(),
  ]);
  const user = viewer.user;
  const isAdmin = adminSession || Boolean(user && isAdminEmail(user.email));
  const isAuthenticated = adminSession || Boolean(user);

  const t = linkLabels[locale];

  const textColor = theme === "dark" ? "text-slate-900" : "text-slate-900";
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-HK");

  const navLinks = [
    ...userLinks.filter((link) => !(isAdmin && link.key === "dashboard")).map((link) => ({
      href: link.href,
      label: t[link.key],
    })),
    ...(isAdmin
      ? adminLinks.map((link) => ({
        href: link.href,
        label: t[link.key],
      }))
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-2 sm:px-6 sm:py-3 lg:px-8">
        <Link href="/" className={`flex items-center gap-3 text-sm font-semibold ${textColor}`}>
          <Image
            src="/mission-one-logo-trimmed.png"
            alt="Mission One"
            width={120}
            height={96}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
          <span className="sr-only">Mission One</span>
        </Link>

        {!isAdmin && viewerLevel ? (
          <div className="ml-4 hidden min-w-[300px] flex-col md:flex">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[11px] text-amber-700">★</span>
              <span className="rounded border border-cyan-300 bg-cyan-50 px-2 py-0.5 font-black tracking-wide text-cyan-700">
                LV.{viewerLevel.userLevel}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-600">
                {viewerLevel.levelProgress.isMaxLevel
                  ? (locale === "en" ? "MAX" : "已滿級")
                  : (locale === "en"
                    ? `${numberFormat.format(viewerLevel.levelProgress.expToNextLevel)} XP to next`
                    : `尚差 ${numberFormat.format(viewerLevel.levelProgress.expToNextLevel)} XP`)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                style={{ width: `${Math.max(0, Math.min(100, viewerLevel.levelProgress.progressPercent))}%` }}
              />
            </div>
          </div>
        ) : null}

        {isAuthenticated ? (
          <div className="ml-auto flex items-center gap-3">
            <HeaderMainNav links={navLinks} />
            <div className="hidden md:block">
              <HeaderNotificationCenter locale={locale} theme={theme} />
            </div>

            <div className="hidden md:block">
              <HeaderSideMenu
                locale={locale}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
              />
            </div>
            <MobileBottomNav links={navLinks} />
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/login"
              className={`border px-4 py-2 text-sm font-semibold tracking-wide transition ${theme === "dark"
                ? "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              style={{ borderRadius: "0.75rem", clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
            >
              {t.login}
            </Link>
            <Link
              href="/register"
              className={`px-4 py-2 text-sm font-semibold tracking-wide transition ${theme === "dark"
                ? "bg-cyan-500 text-white hover:bg-cyan-600"
                : "bg-cyan-500 text-white hover:bg-cyan-600"
                }`}
              style={{ borderRadius: "0.75rem", clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
            >
              {t.start}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
