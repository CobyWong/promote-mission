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
    dashboard: "創作者面板",
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
    dashboard: "Creator Dashboard",
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

  const borderColor = theme === "dark" ? "border-white/10" : "border-slate-200";
  const bgColor = theme === "dark" ? "bg-slate-950/80" : "bg-white/80";
  const textColor = theme === "dark" ? "text-white" : "text-slate-900";
  const tertiaryTextColor = theme === "dark" ? "text-slate-400" : "text-slate-500";

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
    <header className={`sticky top-0 z-50 border-b ${borderColor} ${bgColor} backdrop-blur`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-3 text-sm font-semibold ${textColor}`}>
          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme === "dark" ? "bg-cyan-400/20" : "bg-cyan-400/10"} text-cyan-400`}>
            PM
          </span>
          <span>
            Promote Mission
            <span className={`block text-xs font-normal ${tertiaryTextColor}`}>{t.subtitle}</span>
          </span>
        </Link>

        {isAuthenticated ? (
          <>
            <HeaderMainNav links={navLinks} theme={theme} />

            <HeaderSideMenu
              locale={locale}
              theme={theme}
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
            />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${theme === "dark"
                ? "border-white/20 text-white hover:border-white/40"
                : "border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
            >
              {t.login}
            </Link>
            <Link
              href="/register"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${theme === "dark"
                ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                : "bg-cyan-500 text-white hover:bg-cyan-600"
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
