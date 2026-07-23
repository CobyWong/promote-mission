"use client";

import Link from "next/link";

import type { Locale } from "@/lib/i18n";

type DashboardMissionActionsProps = {
  missionSlug: string;
  locale: Locale;
};

export function DashboardMissionActions({ missionSlug, locale }: DashboardMissionActionsProps) {
  return (
    <Link href={`/missions/${missionSlug}`} className="inline-flex min-h-11 items-center text-amber-300 hover:text-amber-200">
      {locale === "en" ? "View mission status →" : "查看任務狀態 →"}
    </Link>
  );
}
