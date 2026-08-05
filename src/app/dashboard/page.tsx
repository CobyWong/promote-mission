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

type DashboardSearchParams = {
  ig?: string;
  ig_message?: string;
};

function normalizeInstagramErrorMessage(raw: string, locale: "en" | "zh-HK") {
  const value = raw.trim();
  if (!value) {
    return "";
  }

  const lower = value.toLowerCase();

  if (lower.includes("no instagram professional account found")) {
    return locale === "en"
      ? "Instagram API sync setup failed: no Professional account detected. You can continue with your personal public Instagram account, or switch to Professional + link a Facebook Page if you need automatic sync/insights."
      : "Instagram API 同步設定失敗：未偵測到專業帳號。你仍可先使用個人公開 Instagram 帳號；若要自動同步/洞察資料，請改用專業帳號並連結 Facebook 專頁。";
  }

  if (lower.includes("redirect_uri")) {
    return locale === "en"
      ? "Instagram connection failed: redirect URI mismatch in Meta app settings."
      : "Instagram 連接失敗：Meta 應用程式的 redirect URI 設定不一致。";
  }

  return value;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const igStatus = (resolvedSearchParams.ig ?? "").toLowerCase();
  const igMessageRaw = resolvedSearchParams.ig_message ?? "";
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "My Center",
      subtitle: "Manage your account, earnings, missions, and referral tools.",
      profileSection: "Profile",
      accountSection: "Account & Progress",
      financeSection: "Real Money & Coins",
      missionSection: "Missions",
      referralSection: "Referral",
      settingsSection: "Settings",
      supportSection: "Support",
      setting: "Setting",
      profile: "Profile details",
      level: "Level progress",
      earnings: "Real money balance",
      wallet: "Coins balance",
      coinsUnit: "Coins",
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
      igConnected: "Instagram connected successfully.",
      igDenied: "Instagram connection was cancelled.",
      igStateMismatch: "Instagram verification expired. Please try connecting again.",
      igNotConfigured: "Instagram integration is not fully configured by the admin.",
      igFailed: "Instagram connection failed. Please review the message below and retry.",
      igReconnect: "Connect Instagram (optional)",
    }
    : {
      title: "我的檔案",
      subtitle: "集中管理個人檔案、收益、任務與推薦功能。",
      profileSection: "個人檔案",
      accountSection: "帳戶與進度",
      financeSection: "現金與金幣",
      missionSection: "任務",
      referralSection: "推薦",
      settingsSection: "設定",
      supportSection: "支援",
      setting: "設定",
      profile: "個人資料",
      level: "等級進度",
      earnings: "可提現現金",
      wallet: "金幣餘額",
      coinsUnit: "金幣",
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
      igConnected: "Instagram 已成功連接。",
      igDenied: "你已取消 Instagram 連接授權。",
      igStateMismatch: "Instagram 驗證已逾時，請重新連接。",
      igNotConfigured: "Instagram 整合尚未完成設定。",
      igFailed: "Instagram 連接失敗，請查看以下訊息並重試。",
        igReconnect: "連接 Instagram（選填）",
    };

  const dashboard = await getDashboardData();
  const supportEmail = getSupportEmail();
  const supportWhatsappUrl = getSupportWhatsappUrl();
  const avatarInitial = dashboard.profile?.name?.trim().slice(0, 1).toUpperCase() ?? "C";
  const normalizedIgMessage = normalizeInstagramErrorMessage(igMessageRaw, locale);

  const igStatusText = igStatus === "connected"
    ? t.igConnected
    : igStatus === "denied"
      ? t.igDenied
      : igStatus === "state-mismatch"
        ? t.igStateMismatch
        : igStatus === "not-configured"
          ? t.igNotConfigured
          : igStatus === "failed"
            ? t.igFailed
            : "";

  const igStatusTone = igStatus === "connected"
    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
    : igStatus
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "";

  if (dashboard.mode === "unavailable") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <h1 className="tactical-section-title">{t.unavailableTitle}</h1>
        </div>
      </section>
    );
  }

  if (dashboard.mode === "unauthenticated") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <h1 className="tactical-section-title">{t.unauthTitle}</h1>
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
          <h1 className="tactical-section-title">{t.title}</h1>
        </div>
      </div>

      {igStatusText ? (
        <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${igStatusTone}`}>
          <p>{igStatusText}</p>
          {normalizedIgMessage ? <p className="mt-1 text-xs opacity-90">{normalizedIgMessage}</p> : null}
          {igStatus !== "connected" ? (
            <div className="mt-3">
              <Link href="/api/instagram/connect?next=/dashboard" className="inline-flex rounded-full border border-current px-4 py-1.5 text-xs font-semibold transition hover:opacity-90">
                {t.igReconnect}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

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
          <MenuRow href="/dashboard/redemptions" label={t.wallet} value={`${dashboard.balance.toLocaleString()} ${t.coinsUnit}`} />
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
