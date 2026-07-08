"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

type HeaderNotificationCenterProps = {
  locale: Locale;
  theme: Theme;
};

export function HeaderNotificationCenter({ locale, theme }: HeaderNotificationCenterProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.isRead), [notifications]);

  const t = locale === "en"
    ? {
      title: "Notifications",
      empty: "No notifications yet.",
      markAll: "Mark all read",
      markRead: "Mark read",
      openLink: "Open",
      open: "Open notifications",
      unread: "unread",
      refreshing: "Refreshing...",
    }
    : {
      title: "通知中心",
      empty: "暫時未有通知。",
      markAll: "全部標記為已讀",
      markRead: "標記已讀",
      openLink: "開啟",
      open: "打開通知",
      unread: "未讀",
      refreshing: "更新中...",
    };

  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.ok) {
        const result = (await response.json()) as { notifications?: NotificationItem[] };
        setNotifications((result.notifications ?? []).filter((item) => !item.isRead));
      }
      setLoading(false);
    }

    load();
    const timer = setInterval(load, 45000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (!details || !details.open) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !details.contains(target)) {
        details.open = false;
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  async function markAsRead(notificationId: string) {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      return;
    }

    setNotifications((current) => current.filter((item) => item.id !== notificationId));
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markAllRead: true }),
    });

    if (!response.ok) {
      return;
    }

    setNotifications([]);
  }

  function getNotificationCopy(item: NotificationItem) {
    if (locale === "en") {
      return {
        title: item.title,
        message: item.message,
      };
    }

    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    const missionTitle = typeof metadata.missionTitle === "string" ? metadata.missionTitle : "任務";
    const rewardName = typeof metadata.rewardName === "string" ? metadata.rewardName : "獎勵";
    const rewardCoins = typeof metadata.rewardCoins === "number" ? metadata.rewardCoins : 0;
    const totalBonusCoins = typeof metadata.totalBonusCoins === "number" ? metadata.totalBonusCoins : 0;
    const levels = Array.isArray(metadata.levels)
      ? metadata.levels.filter((value): value is number => typeof value === "number")
      : [];
    const levelSummary = levels.length > 0 ? levels.map((level) => `Lv.${level}`).join("、") : "新等級";

    if (item.type === "submission_approved") {
      return {
        title: "任務已通過",
        message: `你提交的「${missionTitle}」已通過審核，已獲得 +${rewardCoins} 金幣。`,
      };
    }

    if (item.type === "submission_needs_edits") {
      return {
        title: "作品需要修改",
        message: `你提交的「${missionTitle}」需要修改，請查看審核備註後重新提交。`,
      };
    }

    if (item.type === "level_up_reward") {
      return {
        title: "Game Pass 升級獎勵",
        message: `你已升至 ${levelSummary}，已獲得 +${totalBonusCoins} 金幣獎勵。`,
      };
    }

    if (item.type === "redemption_requested") {
      return {
        title: "兌換申請已提交",
        message: `你提交的「${rewardName}」兌換申請已送出，現正等待審核。`,
      };
    }

    if (item.type === "redemption_fulfilled") {
      return {
        title: "獎勵已發放",
        message: `你申請的「${rewardName}」已完成兌換。`,
      };
    }

    if (item.type === "redemption_rejected") {
      return {
        title: "兌換申請未通過",
        message: `你申請的「${rewardName}」未通過審核。`,
      };
    }

    if (item.type === "referral_reward") {
      return {
        title: "推薦獎勵已入帳",
        message: `你的推薦已達成條件，已獲得 +${rewardCoins} 金幣。`,
      };
    }

    const systemMap: Record<string, { title: string; message: string }> = {
      "Referral reward under review": {
        title: "推薦獎勵審核中",
        message: `你的推薦獎勵（+${rewardCoins} 金幣）正在進行風險審核。`,
      },
      "Referral milestone unlocked": {
        title: "推薦里程碑達成",
        message: "你已達成推薦里程碑，額外金幣獎勵已入帳。",
      },
      "Referral streak bonus": {
        title: "推薦連續獎勵",
        message: "你本週推薦表現出色，連續獎勵已入帳。",
      },
      "Mission reminder": {
        title: "任務提醒",
        message: "你距離解鎖推薦獎勵只差一個已通過任務，立即完成首個任務吧。",
      },
      "Referral reward released": {
        title: "推薦獎勵已釋放",
        message: `你被暫緩的推薦獎勵（+${rewardCoins} 金幣）已通過審核並發放。`,
      },
      "Referral reward not approved": {
        title: "推薦獎勵未通過",
        message: "你被暫緩的推薦獎勵未通過審核。",
      },
    };

    return systemMap[item.title] ?? {
      title: item.title,
      message: item.message,
    };
  }

  return (
    <details ref={detailsRef} className="relative z-[85]">
      <summary
        aria-label={t.open}
        className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border list-none transition [&::-webkit-details-marker]:hidden ${theme === "dark"
          ? "border-white/20 text-white hover:border-white/40"
          : "border-slate-300 bg-slate-100 text-slate-600 hover:border-slate-400"
          }`}
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M6.5 8a3.5 3.5 0 1 1 7 0v2.8l1.2 1.5a.8.8 0 0 1-.62 1.3H5.9a.8.8 0 0 1-.62-1.3l1.22-1.5V8Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 14.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-slate-950">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </summary>

      <aside
        className={`absolute right-0 mt-3 w-[26rem] max-w-[92vw] rounded-3xl border-2 p-5 shadow-2xl ${theme === "dark" ? "border-white/15 bg-slate-950" : "border-slate-200 bg-white"}`}
        role="dialog"
        aria-label={t.title}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{t.title}</h2>
          <button
            type="button"
            onClick={markAllRead}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${theme === "dark"
              ? "border-white/20 text-slate-200 hover:bg-white/10"
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
          >
            {t.markAll}
          </button>
        </div>

        {loading ? <p className={`mt-3 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{t.refreshing}</p> : null}

        <div className="mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
          {unreadNotifications.length === 0 ? (
            <div className={`rounded-2xl border px-4 py-4 text-sm ${theme === "dark" ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
              {t.empty}
            </div>
          ) : (
            unreadNotifications.slice(0, 12).map((item) => {
              const copy = getNotificationCopy(item);
              const rowClass = theme === "dark" ? "border-cyan-300/30 bg-cyan-950/40" : "border-cyan-300/50 bg-cyan-900/[0.06]";

              const titleClass = theme === "dark" ? "text-cyan-100" : "text-cyan-900";

              const messageClass = theme === "dark" ? "text-slate-200" : "text-slate-800";

              return (
                <div key={item.id} className={`rounded-2xl border p-3 ${rowClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${titleClass}`}>{copy.title}</p>
                      <p className={`mt-1 text-sm ${messageClass}`}>{copy.message}</p>
                      <p className={`mt-2 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{new Date(item.createdAt).toLocaleString(locale === "en" ? "en-US" : "zh-HK")}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-300 px-2 py-1 text-[10px] font-bold text-slate-950">{t.unread}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${theme === "dark"
                        ? "border-white/20 text-slate-200"
                        : "border-slate-300 text-slate-700"
                        }`}
                    >
                      {t.markRead}
                    </button>
                    {item.link ? (
                      <Link
                        href={item.link}
                        onClick={() => {
                          void markAsRead(item.id);
                          if (detailsRef.current) {
                            detailsRef.current.open = false;
                          }
                        }}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${theme === "dark"
                          ? "border-cyan-300/30 text-cyan-200"
                          : "border-cyan-500/30 text-cyan-700"
                          }`}
                      >
                        {t.openLink}
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </details>
  );
}
