"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type UserProfileCardProps = {
  locale: Locale;
  initialName: string;
  initialHandle: string;
  initialFollowersRange: string;
  email?: string | null;
  canEdit?: boolean;
  startEditing?: boolean;
};

type InstagramVisibility = "public" | "private" | "unknown" | "not_connected";

export function UserProfileCard({
  locale,
  initialName,
  initialHandle,
  initialFollowersRange,
  email,
  canEdit = true,
  startEditing = false,
}: UserProfileCardProps) {
  const router = useRouter();
  const t = locale === "en"
    ? {
      title: "Your profile",
      subtitle: "Set up your creator profile like account center.",
      name: "Full name",
      handle: "Instagram handle",
      visibilityPublic: "Public",
      visibilityPrivate: "Private",
      visibilityUnknown: "Unknown",
      visibilityNotConnected: "Not connected",
      followers: "Followers range",
      save: "Save profile",
      saving: "Saving...",
      saved: "Profile saved.",
      error: "Unable to save profile. Please try again.",
      edit: "Edit",
      close: "Close",
      demo: "Profile saving is unavailable until Supabase is configured.",
      noEmail: "No email",
    }
    : {
      title: "你的帳號",
      subtitle: "建立並管理創作者個人檔案。",
      name: "姓名",
      handle: "Instagram 帳號",
      visibilityPublic: "公開",
      visibilityPrivate: "私人",
      visibilityUnknown: "未知",
      visibilityNotConnected: "未連接",
      followers: "追蹤數區間",
      save: "儲存個人檔案",
      saving: "儲存中...",
      saved: "個人檔案已更新。",
      error: "更新失敗，請稍後再試。",
      edit: "編輯",
      close: "關閉",
      demo: "未完成 Supabase 設定前，暫時未能儲存個人資料。",
      noEmail: "尚未提供電郵",
    };

  const [name, setName] = useState(initialName);
  const [handle, setHandle] = useState(initialHandle.replace(/^@/, ""));
  const [followersRange, setFollowersRange] = useState(initialFollowersRange);
  const [editing, setEditing] = useState(startEditing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<InstagramVisibility>("unknown");

  useEffect(() => {
    let active = true;

    async function loadVisibility() {
      const response = await fetch("/api/instagram/account-visibility", {
        method: "GET",
      });

      const payload = (await response.json().catch(() => null)) as { visibility?: InstagramVisibility } | null;
      if (!active) {
        return;
      }

      const nextVisibility = payload?.visibility;
      if (nextVisibility === "public" || nextVisibility === "private" || nextVisibility === "unknown" || nextVisibility === "not_connected") {
        setVisibility(nextVisibility);
      }
    }

    void loadVisibility();

    return () => {
      active = false;
    };
  }, []);

  const visibilityLabel = visibility === "public"
    ? t.visibilityPublic
    : visibility === "private"
      ? t.visibilityPrivate
      : visibility === "not_connected"
        ? t.visibilityNotConnected
        : t.visibilityUnknown;

  const initials = useMemo(() => {
    const trimmed = (name || "").trim();
    if (!trimmed) {
      return "U";
    }

    const parts = trimmed.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
  }, [name]);

  async function onSave() {
    setMessage(null);
    setError(null);

    if (!canEdit || !hasSupabaseConfig()) {
      setError(t.demo);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t.demo);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t.error);
      setSaving(false);
      return;
    }

    const cleanName = name.trim();
    const cleanHandle = handle.trim().replace(/^@/, "");
    const cleanFollowers = followersRange.trim();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName || null,
        instagram_handle: cleanHandle ? `@${cleanHandle}` : null,
        followers_range: cleanFollowers || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      setError(profileError.message || t.error);
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: cleanName || null,
        instagram_handle: cleanHandle ? `@${cleanHandle}` : null,
        followers_range: cleanFollowers || null,
      },
    });

    setMessage(t.saved);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{t.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((value) => !value);
            setMessage(null);
            setError(null);
          }}
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40"
        >
          {editing ? t.close : t.edit}
        </button>
      </div>

      <div className="mt-6 rounded-[1.25rem] bg-white/10 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/30 text-lg font-semibold text-slate-900">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold text-white">{name || "-"}</p>
            <p className="truncate text-slate-300">{email || t.noEmail}</p>
            <p className="mt-1 text-xs text-slate-400">{t.handle}: {visibilityLabel}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-200">{handle ? `@${handle}` : "@-"}</div>
        </div>
      </div>

      {editing ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            {t.name}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="Coby Wong"
            />
          </label>

          <label className="text-sm text-slate-300">
            {t.handle} ({visibilityLabel})
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="cywong1015"
            />
          </label>

          <label className="text-sm text-slate-300">
            {t.followers}
            <input
              value={followersRange}
              onChange={(event) => setFollowersRange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="5K - 20K"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
