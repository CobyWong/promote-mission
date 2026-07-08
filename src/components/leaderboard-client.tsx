"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Leader } from "@/lib/data";

type Tab = "coins" | "missions" | "followers";

const MEDALS = ["🥇", "🥈", "🥉"];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "text-fuchsia-300",
  TikTok: "text-cyan-300",
  YouTube: "text-rose-300",
};

type Props = {
  locale: Locale;
  leaders: Leader[];
  mode: "demo" | "live";
};

export function LeaderboardClient({ locale, leaders, mode }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("coins");

  const t =
    locale === "en"
      ? {
          tabs: { coins: "Coins Earned", missions: "Missions Done", followers: "Followers" },
          demo: "Demo data — real rankings will appear after Supabase setup.",
          rank: "Rank",
          creator: "Creator",
          platform: "Platform",
          followers: "Followers",
          coins: "Coins",
          missions: "Missions",
          topBadge: "Top Creator",
          thisMonth: "This month",
          emptyTitle: "No creators ranked yet",
          emptyDesc: "Be the first to complete a mission and claim the #1 spot!",
        }
      : {
          tabs: { coins: "金幣收益", missions: "完成任務", followers: "追蹤數" },
          demo: "示範資料 — 完成 Supabase 設定後會顯示真實排名。",
          rank: "排名",
          creator: "創作者",
          platform: "平台",
          followers: "追蹤數",
          coins: "金幣",
          missions: "任務數",
          topBadge: "頂尖創作者",
          thisMonth: "本月",
          emptyTitle: "暫無排名",
          emptyDesc: "完成第一個任務，搶佔 #1 寶座！",
        };

  const sorted = [...leaders].sort((a, b) => {
    if (activeTab === "coins") return b.coins - a.coins;
    if (activeTab === "missions") return (b.missionsCompleted ?? 0) - (a.missionsCompleted ?? 0);
    return 0; // followers sort — already a string; keep original order
  });

  const tabs: Tab[] = ["coins", "missions", "followers"];

  return (
    <div className="mt-10">
      {mode === "demo" && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {t.demo}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      {/* Top-3 podium */}
      {sorted.length >= 3 && (
        <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-6">
          {([1, 0, 2] as const).map((idx) => {
            const leader = sorted[idx];
            const podiumHeights = ["h-28", "h-36", "h-24"];
            return (
              <div key={leader.name} className="flex flex-col items-center gap-2">
                <div className="text-3xl">{MEDALS[idx]}</div>
                <div className="glass-panel w-full p-4 text-center">
                  <p className="font-semibold text-white truncate">{leader.name}</p>
                  <p className={`text-xs mt-1 ${PLATFORM_COLORS[leader.platform] ?? "text-slate-400"}`}>
                    {leader.platform}
                  </p>
                  {activeTab === "coins" && (
                    <p className="mt-2 text-lg font-bold text-cyan-300">{leader.coins.toLocaleString()}</p>
                  )}
                  {activeTab === "missions" && (
                    <p className="mt-2 text-lg font-bold text-cyan-300">{leader.missionsCompleted ?? 0}</p>
                  )}
                  {activeTab === "followers" && (
                    <p className="mt-2 text-lg font-bold text-cyan-300">{leader.followers}</p>
                  )}
                </div>
                <div
                  className={`w-full rounded-t-xl bg-gradient-to-t from-cyan-400/20 to-cyan-400/5 border border-cyan-400/20 ${podiumHeights[idx]}`}
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
            <p className="text-2xl font-semibold text-white">{t.emptyTitle}</p>
            <p className="mt-3 text-slate-300">{t.emptyDesc}</p>
          </div>
        ) : (
          sorted.map((leader, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={leader.name}
                className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition ${
                  isTop3
                    ? "border-cyan-400/25 bg-cyan-400/8"
                    : "border-white/8 bg-white/5 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center text-lg">
                    {isTop3 ? MEDALS[index] : `#${index + 1}`}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{leader.name}</p>
                    <p className={`text-xs mt-0.5 ${PLATFORM_COLORS[leader.platform] ?? "text-slate-400"}`}>
                      {leader.platform} · {leader.followers}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {activeTab === "coins" && (
                    <>
                      <p className="font-bold text-cyan-300 text-lg">{leader.coins.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{t.coins}</p>
                    </>
                  )}
                  {activeTab === "missions" && (
                    <>
                      <p className="font-bold text-cyan-300 text-lg">{leader.missionsCompleted ?? 0}</p>
                      <p className="text-xs text-slate-400">{t.missions}</p>
                    </>
                  )}
                  {activeTab === "followers" && (
                    <>
                      <p className="font-bold text-cyan-300 text-lg">{leader.followers}</p>
                      <p className="text-xs text-slate-400">{t.followers}</p>
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
