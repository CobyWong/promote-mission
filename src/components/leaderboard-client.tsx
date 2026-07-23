"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Leader } from "@/lib/data";

type Tab = "coins" | "missions" | "followers";

const MEDALS = ["🥇", "🥈", "🥉"];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "text-fuchsia-600",
  TikTok: "text-cyan-700",
  YouTube: "text-rose-600",
};

type Props = {
  locale: Locale;
  leaders: Leader[];
  mode: "unavailable" | "live";
};

export function LeaderboardClient({ locale, leaders, mode }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("coins");

  const t =
    locale === "en"
      ? {
          tabs: { coins: "Total Likes", missions: "Missions Done", followers: "Followers" },
          unavailable: "Leaderboard is unavailable until backend services are configured.",
          rank: "Rank",
          creator: "Creator",
          platform: "Platform",
          followers: "Followers",
          coins: "Likes",
          missions: "Missions",
          topBadge: "Top Creator",
          thisMonth: "This month",
          emptyTitle: "No creators ranked yet",
          emptyDesc: "Be the first to complete a mission and claim the #1 spot!",
        }
      : {
          tabs: { coins: "總 Like 數", missions: "完成任務", followers: "追蹤數" },
          unavailable: "完成後端服務設定後，方可顯示排行榜資料。",
          rank: "排名",
          creator: "創作者",
          platform: "平台",
          followers: "追蹤數",
          coins: "Like",
          missions: "任務數",
          topBadge: "頂尖創作者",
          thisMonth: "本月",
          emptyTitle: "暫無排名",
          emptyDesc: "完成首個任務後，即可參與排行榜競逐。",
        };

  const sorted = [...leaders].sort((a, b) => {
    if (activeTab === "coins") {
      if (b.totalLikes !== a.totalLikes) {
        return b.totalLikes - a.totalLikes;
      }
      return b.coins - a.coins;
    }
    if (activeTab === "missions") return (b.missionsCompleted ?? 0) - (a.missionsCompleted ?? 0);
    return 0; // followers sort — already a string; keep original order
  });

  const tabs: Tab[] = ["coins", "missions", "followers"];

  return (
    <div className="mt-10">
      {mode === "unavailable" && (
        <div className="mb-6 rounded-2xl border border-amber-400/45 bg-amber-100 px-4 py-3 text-sm text-amber-800">
          {t.unavailable}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-slate-300 bg-slate-100 p-1 sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`min-w-[7.5rem] flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:min-w-0 sm:flex-none sm:px-5 ${
              activeTab === tab
                ? "bg-cyan-600 text-white"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      {/* Top-3 podium */}
      {sorted.length >= 3 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {([1, 0, 2] as const).map((idx) => {
            const leader = sorted[idx];
            const podiumHeights = ["h-28", "h-36", "h-24"];
            return (
              <div key={leader.name} className="flex flex-col items-center gap-2">
                <div className="text-3xl">{MEDALS[idx]}</div>
                <div className="glass-panel w-full p-4 text-center">
                  {leader.reelUrl ? (
                    <a
                      href={leader.reelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-cyan-700"
                    >
                      {leader.name}
                    </a>
                  ) : (
                    <p className="truncate text-sm font-semibold text-slate-900">{leader.name}</p>
                  )}
                  <p className={`text-xs mt-1 ${PLATFORM_COLORS[leader.platform] ?? "text-slate-400"}`}>
                    {leader.platform}
                  </p>
                  {activeTab === "coins" && (
                    <p className="mt-2 text-lg font-bold text-cyan-700">{leader.totalLikes.toLocaleString()}</p>
                  )}
                  {activeTab === "missions" && (
                    <p className="mt-2 text-lg font-bold text-cyan-700">{leader.missionsCompleted ?? 0}</p>
                  )}
                  {activeTab === "followers" && (
                    <p className="mt-2 text-lg font-bold text-cyan-700">{leader.followers}</p>
                  )}
                </div>
                <div
                  className={`w-full rounded-t-xl border border-cyan-300/45 bg-gradient-to-t from-cyan-200/35 to-cyan-100/30 ${podiumHeights[idx]}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranked list */}
      <div className="mt-8 space-y-3">
        {sorted.length === 0 ? (
          <div className="glass-panel p-10 text-center">
            <p className="text-2xl font-semibold text-slate-900">{t.emptyTitle}</p>
            <p className="mt-3 text-slate-600">{t.emptyDesc}</p>
          </div>
        ) : (
          sorted.map((leader, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={leader.name}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 sm:px-5 transition ${
                  isTop3
                    ? "border-cyan-300/45 bg-cyan-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="w-8 text-center text-lg">
                    {isTop3 ? MEDALS[index] : `#${index + 1}`}
                  </span>
                  <div className="min-w-0">
                    {leader.reelUrl ? (
                      <a
                        href={leader.reelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-cyan-700"
                      >
                        {leader.name}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-semibold text-slate-900">{leader.name}</p>
                    )}
                    <p className={`mt-0.5 truncate text-xs ${PLATFORM_COLORS[leader.platform] ?? "text-slate-400"}`}>
                      {leader.platform} · {leader.followers}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {activeTab === "coins" && (
                    <>
                      <p className="text-lg font-bold text-cyan-700">{leader.totalLikes.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{t.coins}</p>
                    </>
                  )}
                  {activeTab === "missions" && (
                    <>
                      <p className="text-lg font-bold text-cyan-700">{leader.missionsCompleted ?? 0}</p>
                      <p className="text-xs text-slate-500">{t.missions}</p>
                    </>
                  )}
                  {activeTab === "followers" && (
                    <>
                      <p className="text-lg font-bold text-cyan-700">{leader.followers}</p>
                      <p className="text-xs text-slate-500">{t.followers}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
