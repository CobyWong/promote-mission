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
      <Link href={`/submit/${missionSlug}`} className="tactical-link inline-flex min-h-11 items-center">
        {locale === "en" ? "Submit proof →" : "提交證明 →"}
      </Link>
    );
  }

  return (
    <Link href={`/missions/${missionSlug}`} className="inline-flex min-h-11 items-center text-amber-300 hover:text-amber-200">
      {locale === "en" ? "Accept mission first →" : "請先完成任務接受流程 →"}
    </Link>
  );
}
