"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type UserProfileCardProps = {
  locale: Locale;
  initialName: string;
  initialHandle: string;
  initialNiche: string;
  initialFollowersRange: string;
  initialPortfolioUrl?: string;
  email?: string | null;
  canEdit?: boolean;
  startEditing?: boolean;
};

export function UserProfileCard({
  locale,
  initialName,
  initialHandle,
  initialNiche,
  initialFollowersRange,
  initialPortfolioUrl,
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
      niche: "Content niche",
      followers: "Followers range",
      portfolio: "Portfolio / media kit URL",
      save: "Save profile",
      saving: "Saving...",
      saved: "Profile saved.",
      error: "Unable to save profile. Please try again.",
      edit: "Edit",
      close: "Close",
      demo: "Demo mode only. Connect Supabase to save real profile data.",
      noEmail: "No email",
    }
    : {
      title: "你的帳號",
      subtitle: "建立創作者個人檔案，風格類似帳號中心。",
      name: "姓名",
      handle: "Instagram 帳號",
      niche: "內容類型",
      followers: "追蹤數區間",
      portfolio: "作品集 / Media Kit 連結",
      save: "儲存個人檔案",
      saving: "儲存中...",
      saved: "個人檔案已更新。",
      error: "更新失敗，請稍後再試。",
      edit: "編輯",
      close: "關閉",
      demo: "目前為示範模式，連接 Supabase 後先可儲存真實資料。",
      noEmail: "未有電郵",
    };

  const [name, setName] = useState(initialName);
  const [handle, setHandle] = useState(initialHandle.replace(/^@/, ""));
  const [niche, setNiche] = useState(initialNiche);
  const [followersRange, setFollowersRange] = useState(initialFollowersRange);
  const [portfolioUrl, setPortfolioUrl] = useState(initialPortfolioUrl ?? "");
  const [editing, setEditing] = useState(startEditing);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const cleanNiche = niche.trim();
    const cleanFollowers = followersRange.trim();
    const cleanPortfolio = portfolioUrl.trim();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName || null,
        instagram_handle: cleanHandle ? `@${cleanHandle}` : null,
        niche: cleanNiche || null,
        followers_range: cleanFollowers || null,
        portfolio_url: cleanPortfolio || null,
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
        niche: cleanNiche || null,
        followers_range: cleanFollowers || null,
        portfolio_url: cleanPortfolio || null,
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
            {t.handle}
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="cywong1015"
            />
          </label>

          <label className="text-sm text-slate-300">
            {t.niche}
            <input
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="Lifestyle / Tech"
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

          <label className="text-sm text-slate-300 sm:col-span-2">
            {t.portfolio}
            <input
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
              placeholder="https://..."
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
