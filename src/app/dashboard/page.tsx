import Link from "next/link";

import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getSupportEmail, getSupportWhatsappUrl } from "@/lib/supabase/env";

type MenuRowProps = {
  href: string;
  label: string;
  value?: string;
};

function MenuRow({ href, label, value }: MenuRowProps) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl px-1 py-3 text-slate-200 transition hover:bg-white/5">
      <p className="text-lg font-medium text-slate-100">{label}</p>
      <div className="flex items-center gap-3">
        {value ? <span className="text-base font-semibold text-cyan-200">{value}</span> : null}
        <span className="text-2xl leading-none text-slate-400">›</span>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "My Center",
      subtitle: "Manage your account, earnings, missions, and referral tools.",
      profileSection: "Profile",
      accountSection: "Account & Progress",
      financeSection: "Earnings & Wallet",
      missionSection: "Missions",
      referralSection: "Referral",
      settingsSection: "Settings",
      supportSection: "Support",
      setting: "Setting",
      profile: "Profile details",
      level: "Level progress",
      earnings: "Earnings summary",
      wallet: "Wallet and redemption",
      missions: "Active missions",
      referrals: "Referral center",
      support: "Support center",
      noActiveMissions: "No active missions",
      pendingReviews: "Pending",
      goLogin: "Go to login",
      createAccount: "Create account",
      getMore: "Get more missions",
      unavailableTitle: "Service setup required",
      unavailableDesc: "Dashboard data is unavailable until backend services are configured.",
      profileCenter: "Profile Center",
      userId: "User ID",
    }
    : {
      title: "我的檔案",
      subtitle: "集中管理個人檔案、收益、任務與推薦功能。",
      profileSection: "個人檔案",
      accountSection: "帳戶與進度",
      financeSection: "收益與錢包",
      missionSection: "任務",
      referralSection: "推薦",
      settingsSection: "設定",
      supportSection: "支援",
      setting: "設定",
      profile: "個人資料",
      level: "等級進度",
      earnings: "收益總覽",
      wallet: "錢包與兌換",
      missions: "進行中任務",
      referrals: "推薦中心",
      support: "客服中心",
      noActiveMissions: "暫無進行中任務",
      pendingReviews: "待審核",
      unauthTitle: "請先登入以檢視個人檔案",
      unauthDesc: "啟用 Supabase 後，此頁將顯示你的個人資料、收益概況、進行中任務與客服聯絡方式。",
      goLogin: "前往登入",
      createAccount: "建立帳號",
      getMore: "探索更多任務",
      profileCenter: "個人檔案",
      userId: "用戶編號",
      unavailableTitle: "服務尚未完成設定",
      unavailableDesc: "後端服務未完成設定前，儀表板資料暫時不可用。",
    };

  const dashboard = await getDashboardData();
  const supportEmail = getSupportEmail();
  const supportWhatsappUrl = getSupportWhatsappUrl();
  const avatarInitial = dashboard.profile?.name?.trim().slice(0, 1).toUpperCase() ?? "C";

  if (dashboard.mode === "unavailable") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.unavailableTitle}</h1>
          <p className="tactical-section-lead mx-auto">
            {t.unavailableDesc}
          </p>
        </div>
      </section>
    );
  }

  if (dashboard.mode === "unauthenticated") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.unauthTitle}</h1>
          <p className="tactical-section-lead mx-auto">
            {t.unauthDesc}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="tactical-btn-primary px-6 py-3">
              {t.goLogin}
            </Link>
            <Link href="/register" className="tactical-btn-ghost px-6 py-3">
              {t.createAccount}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.title}</h1>
          <p className="tactical-section-lead">
            {t.subtitle}
          </p>
        </div>
      </div>

      <Link href="/dashboard/profile?edit=1" className="tactical-card mt-10 block p-6 transition hover:bg-white/5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-3xl font-semibold text-amber-200">
              {avatarInitial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold text-slate-100">{dashboard.profile.name}</p>
              <p className="mt-1 truncate text-slate-300">{dashboard.profile.handle}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{dashboard.userEmail ?? "-"}</p>
              <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-cyan-200">{t.userId}: {dashboard.profile.userId}</p>
            </div>
          </div>
          <span className="text-3xl leading-none text-slate-400">›</span>
        </div>
      </Link>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.accountSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow href="/dashboard/profile" label={t.profile} />
          <MenuRow href="/dashboard/profile#level-progress" label={t.level} />
        </div>
      </div>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.financeSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow href="/dashboard/earnings" label={t.earnings} value={`HK$${dashboard.totalEarned.toLocaleString()}`} />
          <MenuRow href="/dashboard/redemptions" label={t.wallet} value={dashboard.balance.toLocaleString()} />
        </div>
      </div>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.missionSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow
            href="/dashboard/missions"
            label={t.missions}
            value={`${dashboard.activeMissions.length || 0} · ${t.pendingReviews} ${dashboard.pendingCount}`}
          />
          <MenuRow href="/missions" label={t.getMore} value={dashboard.activeMissions.length ? undefined : t.noActiveMissions} />
        </div>
      </div>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.referralSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow href="/dashboard/referrals" label={t.referrals} value={dashboard.referralStats.referralCode} />
        </div>
      </div>

      <div id="settings-center" className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.settingsSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow href="/dashboard/settings" label={t.setting} />
        </div>
      </div>

      <div id="support-center" className="tactical-card mt-8 p-5 sm:p-8">
        <p className="text-sm font-semibold tracking-[0.08em] text-slate-300">{t.supportSection}</p>
        <div className="mt-4 divide-y divide-white/10">
          <MenuRow href="/dashboard/support" label={t.support} />
          {supportEmail ? <MenuRow href={`mailto:${supportEmail}`} label={supportEmail} /> : null}
          {supportWhatsappUrl ? <MenuRow href={supportWhatsappUrl} label="WhatsApp" /> : null}
        </div>
      </div>
    </section>
  );
}
