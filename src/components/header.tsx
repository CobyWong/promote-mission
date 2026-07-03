import Link from "next/link";

import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";
import { isAdminEmail } from "@/lib/supabase/env";
import { hasAdminSession } from "@/lib/admin-session";
import { getCurrentViewer } from "@/lib/backend";
import { HeaderMainNav } from "@/components/header-main-nav";
import { HeaderSideMenu } from "@/components/header-side-menu";

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
  const [adminSession, viewer] = await Promise.all([hasAdminSession(), getCurrentViewer()]);
  const user = viewer.user;
  const isAdmin = adminSession || Boolean(user && isAdminEmail(user.email));
  const isAuthenticated = adminSession || Boolean(user);

  const t = linkLabels[locale];

  const textColor = theme === "dark" ? "text-white" : "text-slate-900";

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
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-3 text-sm font-semibold ${textColor}`}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${theme === "dark"
            ? "border-cyan-300/40 bg-gradient-to-br from-cyan-300/30 via-sky-400/20 to-amber-300/30 text-cyan-100"
            : "border-sky-200 bg-gradient-to-br from-cyan-100 via-blue-100 to-orange-100 text-blue-700"
            }`}>
            MO
          </span>
          <span className="sr-only">Mission One</span>
        </Link>

        {isAuthenticated ? (
          <div className="ml-auto flex items-center gap-3">
            <HeaderMainNav links={navLinks} theme={theme} />

            <HeaderSideMenu
              locale={locale}
              theme={theme}
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/login"
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${theme === "dark"
                ? "border-cyan-300/35 text-cyan-100 hover:border-cyan-200 hover:bg-cyan-400/10"
                : "border-sky-300 text-slate-700 hover:border-sky-400 hover:bg-white"
                }`}
            >
              {t.login}
            </Link>
            <Link
              href="/register"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${theme === "dark"
                ? "bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.45)] hover:from-cyan-200 hover:to-amber-200"
                : "bg-gradient-to-r from-blue-600 via-sky-500 to-orange-500 text-white shadow-[0_8px_22px_rgba(59,130,246,0.35)] hover:from-blue-500 hover:to-orange-400"
                }`}
            >
              {t.start}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
