"use client";

import { useMemo, useState } from "react";

import type { AdminManagedUser } from "@/lib/backend";
import type { Locale } from "@/lib/i18n";

type AdminUserManagerProps = {
  initialUsers: AdminManagedUser[];
  locale: Locale;
};

type EditableForm = {
  fullName: string;
  instagramHandle: string;
  niche: string;
  followersRange: string;
  portfolioUrl: string;
};

function formatDate(value: string, locale: Locale) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(locale === "en" ? "en-US" : "zh-HK");
}

export function AdminUserManager({ initialUsers, locale }: AdminUserManagerProps) {
  const t = locale === "en"
    ? {
      totalUsers: "Total users",
      adminUsers: "Admin users",
      brandUsers: "Brand users",
      recentlyActive: "Signed in (30d)",
      search: "Search by email / name / handle",
      noResults: "No matching users.",
      joined: "Joined",
      lastSignIn: "Last sign-in",
      profile: "Profile",
      adminTag: "Admin",
      brandTag: "Brand",
      edit: "Edit",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving...",
      delete: "Delete",
      deleting: "Deleting...",
      confirmDelete: "Delete this user account? This cannot be undone.",
      saveFailed: "Failed to update user profile.",
      deleteFailed: "Failed to delete user.",
      fullName: "Full name",
      igHandle: "Instagram handle",
      niche: "Niche",
      followersRange: "Followers range",
      portfolioUrl: "Portfolio URL",
      updated: "Updated.",
      deleted: "User deleted.",
    }
    : {
      totalUsers: "總用戶數",
      adminUsers: "管理員",
      brandUsers: "品牌帳號",
      recentlyActive: "30日內登入",
      search: "用 email / 名稱 / IG 搜尋",
      noResults: "找不到符合條件的用戶。",
      joined: "註冊時間",
      lastSignIn: "最後登入",
      profile: "個人檔案",
      adminTag: "管理員",
      brandTag: "品牌",
      edit: "編輯",
      cancel: "取消",
      save: "儲存",
      saving: "儲存中...",
      delete: "刪除",
      deleting: "刪除中...",
      confirmDelete: "確定要刪除此帳號？此操作無法復原。",
      saveFailed: "更新用戶資料失敗。",
      deleteFailed: "刪除用戶失敗。",
      fullName: "姓名",
      igHandle: "Instagram 帳號",
      niche: "內容類型",
      followersRange: "追蹤數區間",
      portfolioUrl: "作品集連結",
      updated: "已更新。",
      deleted: "已刪除用戶。",
    };

  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditableForm>({
    fullName: "",
    instagramHandle: "",
    niche: "",
    followersRange: "",
    portfolioUrl: "",
  });

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((item) => {
      return [
        item.email,
        item.fullName,
        item.instagramHandle,
      ].some((field) => field.toLowerCase().includes(keyword));
    });
  }, [query, users]);

  const summary = useMemo(() => {
    const now = Date.now();
    const last30Days = 1000 * 60 * 60 * 24 * 30;

    return {
      total: users.length,
      admins: users.filter((item) => item.isAdmin).length,
      brands: users.filter((item) => item.isBrand).length,
      active30d: users.filter((item) => {
        if (!item.lastSignInAt) {
          return false;
        }

        const timestamp = new Date(item.lastSignInAt).getTime();
        return !Number.isNaN(timestamp) && now - timestamp <= last30Days;
      }).length,
    };
  }, [users]);

  function openEdit(user: AdminManagedUser) {
    setEditingId(user.id);
    setError(null);
    setFeedback(null);
    setForm({
      fullName: user.fullName,
      instagramHandle: user.instagramHandle.replace(/^@/, ""),
      niche: user.niche,
      followersRange: user.followersRange,
      portfolioUrl: user.portfolioUrl,
    });
  }

  return (
    <div className="space-y-8">
      {feedback ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t.totalUsers, value: summary.total.toString() },
          { label: t.adminUsers, value: summary.admins.toString() },
          { label: t.brandUsers, value: summary.brands.toString() },
          { label: t.recentlyActive, value: summary.active30d.toString() },
        ].map((item) => (
          <div key={item.label} className="glass-panel p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel p-5">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.search}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="glass-panel p-8 text-slate-300">{t.noResults}</div>
      ) : (
        <div className="grid gap-6">
          {filteredUsers.map((user) => {
            const isEditing = editingId === user.id;
            const isSaving = savingId === user.id;
            const isDeleting = deletingId === user.id;

            return (
              <article key={user.id} className="glass-panel p-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-xl font-semibold text-white">{user.fullName || "-"}</p>
                      {user.isAdmin ? (
                        <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-1 text-xs text-fuchsia-200">{t.adminTag}</span>
                      ) : null}
                      {user.isBrand ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-xs text-amber-200">{t.brandTag}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-slate-300">{user.email}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {t.joined}: {formatDate(user.createdAt, locale)} · {t.lastSignIn}: {formatDate(user.lastSignInAt, locale)}
                    </p>

                    {!isEditing ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">{t.profile}: {user.instagramHandle || "-"}</div>
                        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">{t.niche}: {user.niche || "-"}</div>
                        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">{t.followersRange}: {user.followersRange || "-"}</div>
                        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-300">{t.portfolioUrl}: {user.portfolioUrl || "-"}</div>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-slate-300">
                          {t.fullName}
                          <input
                            value={form.fullName}
                            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                          />
                        </label>

                        <label className="text-sm text-slate-300">
                          {t.igHandle}
                          <input
                            value={form.instagramHandle}
                            onChange={(event) => setForm((current) => ({ ...current, instagramHandle: event.target.value.replace(/^@/, "") }))}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                          />
                        </label>

                        <label className="text-sm text-slate-300">
                          {t.niche}
                          <input
                            value={form.niche}
                            onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                          />
                        </label>

                        <label className="text-sm text-slate-300">
                          {t.followersRange}
                          <input
                            value={form.followersRange}
                            onChange={(event) => setForm((current) => ({ ...current, followersRange: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                          />
                        </label>

                        <label className="text-sm text-slate-300 sm:col-span-2">
                          {t.portfolioUrl}
                          <input
                            value={form.portfolioUrl}
                            onChange={(event) => setForm((current) => ({ ...current, portfolioUrl: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full flex-row gap-3 xl:w-auto xl:flex-col">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                      >
                        {t.edit}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={async () => {
                            setError(null);
                            setFeedback(null);
                            setSavingId(user.id);

                            const response = await fetch(`/api/admin/users/${user.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                full_name: form.fullName,
                                instagram_handle: form.instagramHandle,
                                niche: form.niche,
                                followers_range: form.followersRange,
                                portfolio_url: form.portfolioUrl,
                              }),
                            });

                            if (!response.ok) {
                              const result = (await response.json()) as { error?: string };
                              setError(result.error ?? t.saveFailed);
                              setSavingId(null);
                              return;
                            }

                            const result = (await response.json()) as { user?: AdminManagedUser };
                            if (result.user) {
                              setUsers((current) => current.map((item) => (item.id === user.id ? result.user as AdminManagedUser : item)));
                            }

                            setFeedback(t.updated);
                            setEditingId(null);
                            setSavingId(null);
                          }}
                          className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                        >
                          {isSaving ? t.saving : t.save}
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setEditingId(null);
                            setError(null);
                          }}
                          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 disabled:cursor-not-allowed"
                        >
                          {t.cancel}
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isDeleting || isSaving}
                      onClick={async () => {
                        const accepted = window.confirm(t.confirmDelete);
                        if (!accepted) {
                          return;
                        }

                        setError(null);
                        setFeedback(null);
                        setDeletingId(user.id);

                        const response = await fetch(`/api/admin/users/${user.id}`, {
                          method: "DELETE",
                        });

                        if (!response.ok) {
                          const result = (await response.json()) as { error?: string };
                          setError(result.error ?? t.deleteFailed);
                          setDeletingId(null);
                          return;
                        }

                        setUsers((current) => current.filter((item) => item.id !== user.id));
                        setFeedback(t.deleted);
                        setDeletingId(null);
                        if (editingId === user.id) {
                          setEditingId(null);
                        }
                      }}
                      className="rounded-full border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting ? t.deleting : t.delete}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
