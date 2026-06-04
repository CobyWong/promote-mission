import Link from "next/link";

import { DashboardMissionActions } from "@/components/dashboard-mission-actions";
import { InstagramSyncButton } from "@/components/instagram-sync-button";
import { UserProfileCard } from "@/components/user-profile-card";
import { rewards } from "@/lib/data";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getCurrentLocale();
  const query = await searchParams;
  const igStatus = Array.isArray(query.ig) ? query.ig[0] : query.ig;
  const igMessage = Array.isArray(query.ig_message) ? query.ig_message[0] : query.ig_message;
  const editProfile = Array.isArray(query.editProfile) ? query.editProfile[0] : query.editProfile;
  const t = locale === "en"
    ? {
      title: "Your creator dashboard",
      unauthTitle: "Log in to view your live dashboard",
      unauthDesc: "After enabling Supabase, this page shows your profile, real submissions, coins wallet, and review statuses.",
      goLogin: "Go to login",
      createAccount: "Create account",
      subtitle: "This page highlights post-login creator data: coin balance, active missions, submission queue, and ranking.",
      getMore: "Get more missions",
      activeMissions: "Active missions",
      pendingReviews: "Pending reviews",
      monthlyRank: "Monthly rank",
      demoNotice: "Showing demo data for now. After Supabase setup, this section will reflect your real account.",
      due: "Due",
      reward: "Reward",
      viewBrief: "View brief →",
      submitProof: "Submit proof →",
      checklist: "Proof submission checklist",
      emptyProof: "No live proof submissions yet. Accept a mission first, then submit from this dashboard.",
      nextReward: "Next redeemable reward",
      pointsAway: "Only",
      pointsAwaySuffix: "Coins to redeem",
      quickActions: "Quick actions",
      creatorLogin: "Creator login",
      creatorRegister: "Creator register",
      firstProof: "Submit first mission proof",
      openAdmin: "Open admin review board",
      igPanel: "Instagram insights",
      igPanelDesc: "Connect your Instagram Professional account to auto-record Reel views and engagement metrics.",
      igConnect: "Connect Instagram",
      igConnectedAs: "Connected as",
      igNotConnected: "Instagram not connected yet.",
      igLastSync: "Last sync",
      igSyncNow: "Sync now",
      igSyncing: "Syncing...",
      igSyncSuccess: "Synced reels",
      igRecent: "Recent reel metrics",
      igViews: "Views",
      igReach: "Reach",
      igInteractions: "Interactions",
      igConnected: "Instagram connected successfully.",
      igDenied: "Instagram authorization was cancelled.",
      igFailed: "Instagram connection failed.",
    }
    : {
      title: "你嘅創作者控制台",
      unauthTitle: "請先登入先睇到真實控制台",
      unauthDesc: "Supabase 啟用後，控制台會顯示你嘅個人資料、真實提交記錄、金幣錢包同審核狀態。",
      goLogin: "前往登入",
      createAccount: "建立帳號",
      subtitle: "呢頁示範創作者登入後會睇到嘅重點資訊：金幣結餘、進行中任務、提交清單同排行榜表現。",
      getMore: "接更多任務",
      activeMissions: "進行中任務",
      pendingReviews: "待審核提交",
      monthlyRank: "本月排名",
      demoNotice: "暫時顯示示範資料。設定 Supabase 後，呢度會改為你實際帳號資料。",
      due: "截止",
      reward: "獎勵",
      viewBrief: "查看詳情 →",
      submitProof: "提交證明 →",
      checklist: "提交證明清單",
      emptyProof: "未有真實提交記錄，請先去任務詳情頁接受任務，再返 Dashboard 提交第一份作品證明。",
      nextReward: "下一個可兌換獎賞",
      pointsAway: "距離兌換只差",
      pointsAwaySuffix: "金幣",

      quickActions: "快捷操作",
      creatorLogin: "創作者登入",
      creatorRegister: "創作者註冊",
      firstProof: "提交第一份任務證明",
      openAdmin: "打開審核後台",
      igPanel: "Instagram 數據連接",
      igPanelDesc: "連接 Instagram 專業帳號後，系統可自動記錄 Reels 觀看量同互動數據。",
      igConnect: "連接 Instagram",
      igConnectedAs: "已連接帳號",
      igNotConnected: "仲未連接 Instagram。",
      igLastSync: "最後同步",
      igSyncNow: "立即同步",
      igSyncing: "同步中...",
      igSyncSuccess: "已同步 Reels",
      igRecent: "最近 Reels 數據",
      igViews: "觀看",
      igReach: "觸及",
      igInteractions: "互動",
      igConnected: "Instagram 已成功連接。",
      igDenied: "你已取消 Instagram 授權。",
      igFailed: "Instagram 連接失敗。",
    };

  const dashboard = await getDashboardData();
  const activeMissions = dashboard.activeMissions;
  const summaryCards = [
    { label: locale === "en" ? "Coins Balance" : "金幣結餘", value: dashboard.balance.toLocaleString() },
    { label: t.activeMissions, value: activeMissions.length.toString() },
    { label: t.pendingReviews, value: dashboard.pendingCount.toString() },
    { label: t.monthlyRank, value: dashboard.submissions.length > 0 ? "#12" : "-" },
  ];

  const shouldAutoOpenProfileEditor = editProfile === "1"
    || editProfile === "true"
    || dashboard.profile?.name === "Chloe Wong"
    || dashboard.profile?.handle === "@chloe.creates";
  const nextReward = rewards.find((reward) => reward.cost > dashboard.balance) ?? rewards[rewards.length - 1];
  const pointsToNextReward = Math.max(nextReward.cost - dashboard.balance, 0);
  const igFeedback = igStatus === "connected"
    ? t.igConnected
    : igStatus === "denied"
      ? t.igDenied
      : igStatus === "failed"
        ? `${t.igFailed}${igMessage ? ` ${igMessage}` : ""}`
        : null;

  if (dashboard.mode === "unauthenticated") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="glass-panel mx-auto max-w-3xl p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{locale === "en" ? "Creator Dashboard" : "創作者控制台"}</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{t.unauthTitle}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            {t.unauthDesc}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950">
              {t.goLogin}
            </Link>
            <Link href="/register" className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white">
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
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{locale === "en" ? "Creator Dashboard" : "創作者控制台"}</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{t.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            {t.subtitle}
          </p>
        </div>
        <Link href="/missions" className="rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950">
          {t.getMore}
        </Link>
      </div>

      <div className={`mt-10 grid gap-4 ${summaryCards.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {summaryCards.map((item) => (
          <div key={item.label} className="glass-panel p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <UserProfileCard
          locale={locale}
          initialName={dashboard.profile.name}
          initialHandle={dashboard.profile.handle}
          initialNiche={dashboard.profile.niche}
          initialFollowersRange={dashboard.profile.followers}
          email={dashboard.userEmail}
          canEdit={dashboard.mode === "live"}
          startEditing={shouldAutoOpenProfileEditor}
        />
      </div>

      <div className="mt-8 glass-panel p-8">
        <h2 className="text-2xl font-semibold text-white">{t.igPanel}</h2>
        <p className="mt-3 text-slate-300">{t.igPanelDesc}</p>

        {igFeedback ? (
          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {igFeedback}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          {dashboard.instagramConnection ? (
            <>
              <span className="rounded-full bg-white/5 px-4 py-2">
                {t.igConnectedAs}: @{dashboard.instagramConnection.instagram_username ?? dashboard.instagramConnection.instagram_user_id}
              </span>
              <span className="rounded-full bg-white/5 px-4 py-2">
                {t.igLastSync}: {dashboard.instagramConnection.last_synced_at
                  ? new Date(dashboard.instagramConnection.last_synced_at).toLocaleString(locale === "en" ? "en-US" : "zh-HK")
                  : "-"}
              </span>
            </>
          ) : (
            <span className="rounded-full bg-white/5 px-4 py-2">{t.igNotConnected}</span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/api/instagram/connect" className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950">
            {t.igConnect}
          </Link>
          {dashboard.instagramConnection ? (
            <InstagramSyncButton
              label={t.igSyncNow}
              syncingLabel={t.igSyncing}
              successLabel={t.igSyncSuccess}
            />
          ) : null}
        </div>

        {dashboard.recentInsights.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white">{t.igRecent}</h3>
            <div className="mt-4 grid gap-3">
              {dashboard.recentInsights.slice(0, 5).map((insight) => (
                <div key={insight.id} className="rounded-2xl bg-white/5 px-4 py-4 text-sm text-slate-300">
                  <a className="font-medium text-cyan-300" href={insight.reel_url} target="_blank" rel="noreferrer">
                    {insight.reel_url}
                  </a>
                  <p className="mt-2">
                    {t.igViews}: {insight.plays.toLocaleString()} · {t.igReach}: {insight.reach.toLocaleString()} · {t.igInteractions}: {insight.total_interactions.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-8">
          {dashboard.mode === "demo" ? (
            <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
              {t.demoNotice}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-400">{dashboard.profile.platform} · {dashboard.profile.niche}</p>
              <p className="mt-2 text-xl font-semibold text-white">{dashboard.profile.name} · {dashboard.profile.handle}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">
              {locale === "en" ? "Followers" : "追蹤數"} {dashboard.profile.followers} · {locale === "en" ? "Joined" : "加入時間"} {dashboard.profile.joinedAt}
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white">{t.activeMissions}</h2>
          {activeMissions.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white/5 px-4 py-4 text-slate-300">
              {locale === "en"
                ? "You don’t have any active missions yet. Accept a mission to start tracking it here."
                : "你而家未有進行中任務。先接受一個任務，之後就會喺呢度顯示。"}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {activeMissions.map((mission) => {
              const submissionStatus = dashboard.missionStatusMap?.get(mission.slug);
              const statusColors: Record<string, string> = {
                "Approved": "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                "Pending": "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
                "Needs edits": "border-amber-400/20 bg-amber-400/10 text-amber-200",
              };
              const submissionStatusLabel = locale === "en"
                ? submissionStatus
                : submissionStatus === "Approved"
                  ? "已批准"
                  : submissionStatus === "Pending"
                    ? "待審核"
                    : submissionStatus === "Needs edits"
                      ? "需修改"
                      : submissionStatus;
              const statusColor = submissionStatus ? statusColors[submissionStatus] || statusColors["Pending"] : "";
              
              return <div key={mission.slug} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-cyan-300">{mission.brand}</p>
                      {submissionStatus ? (
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusColor}`}>
                          {submissionStatusLabel}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold text-white">{mission.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{t.due}：{mission.eta} · {t.reward}：{mission.points} {locale === "en" ? "Coins" : "金幣"}</p>
                  </div>
                  <div className="flex gap-3 text-sm font-semibold">
                    <Link href={`/missions/${mission.slug}`} className="text-cyan-300">
                      {t.viewBrief}
                    </Link>
                    <DashboardMissionActions missionSlug={mission.slug} eta={mission.eta} locale={locale} />
                  </div>
                </div>
              </div>;
            })}
            </div>
          )}
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white">{t.checklist}</h2>
          {dashboard.submissions.length > 0 ? (
            <div className="mt-6 space-y-3 text-slate-300">
              {dashboard.submissions.slice(0, 4).map((submission) => (
                <div key={submission.id} className="rounded-2xl bg-white/5 px-4 py-3">
                  {submission.missionTitle} · {locale === "en"
                    ? submission.status
                    : submission.status === "Approved"
                      ? "已批准"
                      : submission.status === "Pending"
                        ? "待審核"
                        : submission.status === "Needs edits"
                          ? "需修改"
                          : submission.status}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-white/5 px-4 py-4 text-slate-300">
              {t.emptyProof}
            </div>
          )}

          <div className="mt-8 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-sm text-cyan-200">{t.nextReward}</p>
            <p className="mt-2 text-xl font-semibold text-white">{nextReward.name}</p>
            <p className="mt-2 text-sm text-slate-200">{t.pointsAway} {pointsToNextReward} {t.pointsAwaySuffix}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
