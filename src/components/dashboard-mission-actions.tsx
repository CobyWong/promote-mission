"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";
import {
  getMissionAcceptanceStorageKey,
  isMissionAcceptanceValid,
} from "@/lib/mission-acceptance";

type DashboardMissionActionsProps = {
  missionSlug: string;
  eta: string;
  locale: Locale;
};

export function DashboardMissionActions({ missionSlug, eta, locale }: DashboardMissionActionsProps) {
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    const key = getMissionAcceptanceStorageKey(missionSlug);
    const refreshStatus = () => {
      const raw = window.localStorage.getItem(key);
      const acceptedAt = raw ? Number(raw) : NaN;
      const valid = !Number.isNaN(acceptedAt) && isMissionAcceptanceValid(acceptedAt, eta);
      setCanSubmit(valid);
    };

    refreshStatus();
    const timer = window.setInterval(refreshStatus, 1000);
    window.addEventListener("storage", refreshStatus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refreshStatus);
    };
  }, [eta, missionSlug]);

  if (canSubmit) {
    return (
      <Link href={`/submit/${missionSlug}`} className="text-blue-600 hover:text-blue-700">
        {locale === "en" ? "Turn in quest →" : "交任務 →"}
      </Link>
    );
  }

  return (
    <Link href={`/missions/${missionSlug}`} className="text-amber-600 hover:text-amber-700">
      {locale === "en" ? "Accept quest first →" : "請先接受關卡 →"}
    </Link>
  );
}
