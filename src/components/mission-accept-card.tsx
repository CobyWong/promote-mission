"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";
import {
  getMissionAcceptanceStorageKey,
} from "@/lib/mission-acceptance";

type MissionAcceptCardProps = {
  missionSlug: string;
  locale: Locale;
  minParticipants?: number;
  currentParticipants?: number;
};

export function MissionAcceptCard({ missionSlug, locale, minParticipants, currentParticipants }: MissionAcceptCardProps) {
  const storageKey = getMissionAcceptanceStorageKey(missionSlug);
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);
  const [displayCount, setDisplayCount] = useState(currentParticipants ?? 0);

  const isLocked = (minParticipants ?? 0) > 0 && displayCount < (minParticipants ?? 0);

  const labels = locale === "en"
    ? {
      title: "Start quest",
      desc: "Accept this quest to begin your run. After accepting, complete the mission and turn it in.",
      needIg: "Requires linked Instagram account",
      styleFit: "Content style matching required",
      dailyCap: "Platform can set daily quest entry limits",
      collaborator: "Add @missionone.hk as collaborator before turn-in",
      accept: "Accept quest",
      accepted: "Quest accepted",
      restart: "Restart quest",
      lockedTitle: "Waiting to Open",
      lockedDesc: "This quest needs a minimum number of players before it unlocks. Register interest to open it faster!",
      participants: "Registered players",
      stillNeed: "Need {n} more players to unlock",
      registerInterest: "✋ Register Interest",
      registeredMsg: "You're in! This quest opens once enough players have joined.",
    }
    : {
      title: "開始關卡",
      desc: "先接受關卡再開始挑戰。接受後完成任務並交件即可過關。",
      needIg: "需要綁定 Instagram 帳號",
      styleFit: "需要過往內容風格配對",
      dailyCap: "平台可設定每日關卡名額上限",
      collaborator: "交件前需將 @missionone.hk 加為協作者",
      accept: "接受關卡",
      accepted: "已接受關卡",
      restart: "重新挑戰",
      lockedTitle: "等待人數開放",
      lockedDesc: "此關卡需達到最低玩家人數先會正式開放。立即登記參加，幫手更快開關！",
      participants: "已登記玩家",
      stillNeed: "還差 {n} 位玩家即可開放",
      registerInterest: "✋ 立即登記參加",
      registeredMsg: "你已成功登記！人數達到後，關卡會正式開放。",
    };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed)) {
        setAcceptedAt(parsed);
      }
    }
  }, [storageKey]);

  const acceptMission = () => {
    const startedAt = Date.now();
    setAcceptedAt(startedAt);
    window.localStorage.setItem(storageKey, String(startedAt));
  };

  const registerInterest = async () => {
    setRegistered(true);
    setDisplayCount((prev) => prev + 1);
    try {
      await fetch(`/api/missions/${missionSlug}/interest`, { method: "POST" });
    } catch {
      // Silently fail in demo mode
    }
  };

  if (isLocked) {
    return (
      <div className="glass-panel p-8">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🔒</span>
          <h2 className="text-2xl font-semibold text-white">{labels.lockedTitle}</h2>
        </div>
        <p className="mt-4 text-slate-300">{labels.lockedDesc}</p>

        <div className="mt-6 rounded-2xl bg-white/5 p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-400">{labels.participants}</span>
            <span className="font-semibold text-white">{displayCount} / {minParticipants}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (displayCount / (minParticipants ?? 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {labels.stillNeed.replace("{n}", String(Math.max(0, (minParticipants ?? 0) - displayCount)))}
          </p>
        </div>

        {registered ? (
          <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-4 text-center text-sm text-green-300">
            {labels.registeredMsg}
          </div>
        ) : (
          <button
            type="button"
            onClick={registerInterest}
            className="mt-6 w-full rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-lg font-semibold text-amber-200 transition hover:bg-amber-400/20"
          >
            {labels.registerInterest}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">{labels.title}</h2>
      <p className="mt-4 text-slate-300">{labels.desc}</p>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.needIg}</div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.styleFit}</div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.dailyCap}</div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.collaborator}</div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3">
        {acceptedAt ? (
          <>
            <p className="text-sm text-slate-400">{labels.accepted}</p>
            <p className="mt-1 text-sm font-semibold text-slate-300">{labels.collaborator}</p>
          </>
        ) : (
          <p className="text-sm text-slate-300">{labels.collaborator}</p>
        )}
      </div>

      <button
        type="button"
        onClick={acceptMission}
        className="mt-6 w-full rounded-full bg-cyan-400 px-5 py-4 text-2xl font-semibold text-slate-950 transition hover:bg-cyan-300"
      >
        {acceptedAt ? labels.restart : labels.accept}
      </button>
    </div>
  );
}
