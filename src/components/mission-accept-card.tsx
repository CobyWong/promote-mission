"use client";

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import {
  getMissionAcceptanceStorageKey,
  getMissionRemainingMs,
  parseMissionEtaToMs,
} from "@/lib/mission-acceptance";

type MissionAcceptCardProps = {
  missionSlug: string;
  eta: string;
  locale: Locale;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}`;
}

export function MissionAcceptCard({ missionSlug, eta, locale }: MissionAcceptCardProps) {
  const storageKey = getMissionAcceptanceStorageKey(missionSlug);
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const labels = locale === "en"
    ? {
      title: "Apply Now",
      desc: "Accept this mission first. The countdown will start after acceptance.",
      needIg: "Requires linked Instagram account",
      styleFit: "Content style matching required",
      dailyCap: "Platform can set daily order limits",
      accept: "Accept mission",
      accepted: "Mission accepted",
      timer: "Time remaining",
      expired: "Time limit reached",
      restart: "Re-accept mission",
    }
    : {
      title: "立即申請",
      desc: "請先接任務，接單後會即時開始倒數。",
      needIg: "需要綁定 Instagram 帳號",
      styleFit: "需要過往內容風格配對",
      dailyCap: "平台可設定每日接單上限",
      accept: "接受任務",
      accepted: "已接受任務",
      timer: "剩餘時間",
      expired: "已超過交稿時限",
      restart: "重新接任務",
    };

  const limitMs = useMemo(() => parseMissionEtaToMs(eta), [eta]);
  const remainingMs = acceptedAt ? getMissionRemainingMs(acceptedAt, eta, now) : limitMs;
  const expired = acceptedAt ? remainingMs <= 0 : false;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && getMissionRemainingMs(parsed, eta) > 0) {
        setAcceptedAt(parsed);
      } else if (!Number.isNaN(parsed)) {
        // Clear stale/expired acceptance data
        window.localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const acceptMission = () => {
    const startedAt = Date.now();
    setAcceptedAt(startedAt);
    window.localStorage.setItem(storageKey, String(startedAt));
  };

  return (
    <div className="glass-panel p-8">
      <h2 className="text-2xl font-semibold text-white">{labels.title}</h2>
      <p className="mt-4 text-slate-300">{labels.desc}</p>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.needIg}</div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.styleFit}</div>
        <div className="rounded-2xl bg-white/5 px-4 py-3">{labels.dailyCap}</div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/5 px-4 py-3">
        {acceptedAt ? (
          <>
            <p className="text-sm text-slate-400">{labels.accepted}</p>
            <p className={`mt-1 text-sm font-semibold ${expired ? "text-rose-300" : "text-slate-300"}`}>
              {expired ? labels.expired : `${labels.timer}: ${formatRemaining(remainingMs)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-300">{labels.timer}: {formatRemaining(limitMs)}</p>
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
