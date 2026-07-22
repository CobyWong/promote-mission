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
  lifecyclePhase?: "upcoming" | "live" | "ranking_confirmation" | "closed";
};

export function MissionAcceptCard({ missionSlug, locale, minParticipants, currentParticipants, lifecyclePhase }: MissionAcceptCardProps) {
  const storageKey = getMissionAcceptanceStorageKey(missionSlug);
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [registered, setRegistered] = useState(false);
  const [displayCount, setDisplayCount] = useState(currentParticipants ?? 0);

  const isLocked = (minParticipants ?? 0) > 0 && displayCount < (minParticipants ?? 0);
  const isOpenForAcceptance = lifecyclePhase === "live";

  const labels = locale === "en"
    ? {
      title: "Apply Now",
      desc: "Accept this mission first. The countdown will start after acceptance.",
      needIg: "Requires linked Instagram account",
      styleFit: "Content style matching required",
      dailyCap: "Platform can set daily order limits",
      collaborator: "Add @missionone_hk as collaborator before submission",
      accept: "Accept mission",
      accepted: "Mission accepted",
      restart: "Re-accept mission",
      lockedTitle: "Waiting to Open",
      lockedDesc: "This mission requires a minimum number of creators before it unlocks. Register your interest to help it open faster!",
      participants: "Registered creators",
      stillNeed: "Still need {n} more to unlock",
      registerInterest: "✋ Register Interest",
      registeredMsg: "You're registered! We'll open the mission once enough creators have joined.",
      deadlinePassed: "Mission deadline has passed. Ranking is fixed and waiting for confirmation.",
      notOpenYet: "This mission is not open for acceptance yet.",
    }
    : {
      title: "立即申請",
      desc: "請先接受任務；接受後將即時開始倒數。",
      needIg: "需要綁定 Instagram 帳號",
      styleFit: "需要過往內容風格配對",
      dailyCap: "平台可設定每日接單上限",
      collaborator: "提交前需將 @missionone_hk 設為協作者",
      accept: "接受任務",
      accepted: "已接受任務",
      restart: "重新接受任務",
      lockedTitle: "等待人數開放",
      lockedDesc: "此任務需要達到最低人數才會正式開放。立即登記參加，讓任務更快開放！",
      participants: "已登記創作者",
      stillNeed: "還差 {n} 人即可開放",
      registerInterest: "✋ 立即登記參加",
      registeredMsg: "已完成登記；達到指定人數後，任務將正式開放。",
      deadlinePassed: "任務截止時間已過，排名已鎖定並等待確認。",
      notOpenYet: "此任務尚未開放接受。",
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
      // Keep registration UX responsive even if the backend request fails.
    }
  };

  if (isLocked) {
    return (
      <div className="glass-panel p-8">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🔒</span>
          <h2 className="text-2xl font-semibold text-slate-900">{labels.lockedTitle}</h2>
        </div>
        <p className="mt-4 text-slate-700">{labels.lockedDesc}</p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-600">{labels.participants}</span>
            <span className="font-semibold text-slate-900">{displayCount} / {minParticipants}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (displayCount / (minParticipants ?? 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {labels.stillNeed.replace("{n}", String(Math.max(0, (minParticipants ?? 0) - displayCount)))}
          </p>
        </div>

        {registered ? (
          <div className="mt-6 rounded-2xl border border-green-400/45 bg-green-100 px-4 py-4 text-center text-sm text-green-800">
            {labels.registeredMsg}
          </div>
        ) : (
          <button
            type="button"
            onClick={registerInterest}
            className="mt-6 w-full rounded-full border border-amber-400/55 bg-amber-100 px-5 py-4 text-lg font-semibold text-amber-800 transition hover:bg-amber-200"
          >
            {labels.registerInterest}
          </button>
        )}
      </div>
    );
  }

  if (!isOpenForAcceptance) {
    return (
      <div className="glass-panel p-8 text-sm text-amber-700">
        {lifecyclePhase === "ranking_confirmation" || lifecyclePhase === "closed" ? labels.deadlinePassed : labels.notOpenYet}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={acceptMission}
      className="w-full rounded-full bg-cyan-400 px-5 py-4 text-2xl font-semibold text-slate-950 transition hover:bg-cyan-300"
    >
      {acceptedAt ? labels.restart : labels.accept}
    </button>
  );
}
