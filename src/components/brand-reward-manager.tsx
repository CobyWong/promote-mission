"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Reward } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type BrandRewardManagerProps = {
  initialRewards: Reward[];
  locale: Locale;
};

export function BrandRewardManager({ initialRewards, locale }: BrandRewardManagerProps) {
  const t = locale === "en"
    ? {
      refreshFailed: "Unable to refresh reward list.",
      saveFailed: "Failed to save reward.",
      deleteFailed: "Failed to delete reward.",
      editReward: "Edit reward",
      createReward: "Create new reward",
      processing: "Processing...",
      updateReward: "Update reward",
      createRewardBtn: "Create reward",
      cancelEdit: "Cancel edit",
      edit: "Edit",
      delete: "Delete",
    }
    : {
      refreshFailed: "無法更新 reward 清單。",
      saveFailed: "儲存 reward 失敗。",
      deleteFailed: "刪除 reward 失敗。",
      editReward: "編輯 reward",
      createReward: "建立新 reward",
      processing: "處理中...",
      updateReward: "更新 reward",
      createRewardBtn: "建立 reward",
      cancelEdit: "取消編輯",
      edit: "編輯",
      delete: "刪除",
    };

  const router = useRouter();
  const [rewards, setRewards] = useState(initialRewards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    cost: 100,
    badge: "",
    description: "",
    eta: "1-3 個工作天",
    stock: 0,
    displayOrder: 0,
    isActive: true,
  });
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  async function refreshFromServer() {
    const response = await fetch("/api/brand/rewards");
    const result = (await response.json()) as { rewards?: Reward[]; error?: string };

    if (!response.ok) {
      setError(result.error ?? t.refreshFailed);
      return;
    }

    setRewards(result.rewards ?? []);
    router.refresh();
  }

  async function submitCreateOrUpdate() {
    setError(null);
    setLoading(true);

    const payload = {
      slug: form.slug,
      name: form.name,
      cost: Number(form.cost),
      badge: form.badge || null,
      description: form.description,
      fulfillment_eta: form.eta,
      stock: Number(form.stock),
      display_order: Number(form.displayOrder),
      is_active: form.isActive,
    };

    const response = await fetch(editingSlug ? `/api/brand/rewards/${editingSlug}` : "/api/brand/rewards", {
      method: editingSlug ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? t.saveFailed);
      setLoading(false);
      return;
    }

    setForm({
      slug: "",
      name: "",
      cost: 100,
      badge: "",
      description: "",
      eta: "1-3 個工作天",
      stock: 0,
      displayOrder: 0,
      isActive: true,
    });
    setEditingSlug(null);
    setLoading(false);
    await refreshFromServer();
  }

  async function deleteReward(slug: string) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/brand/rewards/${slug}`, {
      method: "DELETE",
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? t.deleteFailed);
      setLoading(false);
      return;
    }

    setLoading(false);
    await refreshFromServer();
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="glass-panel p-8">
        <h2 className="text-2xl font-semibold text-white">{editingSlug ? `${t.editReward}: ${editingSlug}` : t.createReward}</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { key: "slug", label: "Slug", type: "text" },
            { key: "name", label: "Name", type: "text" },
            { key: "cost", label: "Cost", type: "number" },
            { key: "badge", label: "Badge", type: "text" },
            { key: "eta", label: "Fulfillment ETA", type: "text" },
            { key: "stock", label: "Stock", type: "number" },
            { key: "displayOrder", label: "Display Order", type: "number" },
          ].map((field) => (
            <label key={field.key} className="block text-sm text-slate-300">
              {field.label}
              <input
                type={field.type}
                value={String(form[field.key as keyof typeof form])}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                disabled={field.key === "slug" && Boolean(editingSlug)}
              />
            </label>
          ))}
        </div>

        <label className="mt-4 block text-sm text-slate-300">
          Description
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          />
        </label>

        <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            className="h-4 w-4"
          />
          Active
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={submitCreateOrUpdate} disabled={loading} className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
            {loading ? t.processing : editingSlug ? t.updateReward : t.createRewardBtn}
          </button>
          {editingSlug ? (
            <button
              type="button"
              onClick={() => {
                setEditingSlug(null);
                setForm({
                  slug: "",
                  name: "",
                  cost: 100,
                  badge: "",
                  description: "",
                  eta: "1-3 個工作天",
                  stock: 0,
                  displayOrder: 0,
                  isActive: true,
                });
              }}
              className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
            >
              {t.cancelEdit}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        {rewards.map((reward) => (
          <div key={reward.slug} className="glass-panel p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-400">{reward.slug}</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{reward.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{reward.cost} Coins · {reward.badge ?? "-"} · Stock {reward.stock ?? "∞"}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(reward.slug);
                    setForm({
                      slug: reward.slug,
                      name: reward.name,
                      cost: reward.cost,
                      badge: reward.badge ?? "",
                      description: reward.description,
                      eta: reward.eta ?? "1-3 個工作天",
                      stock: reward.stock ?? 0,
                      displayOrder: reward.displayOrder ?? 0,
                      isActive: reward.isActive ?? true,
                    });
                  }}
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200"
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  onClick={() => deleteReward(reward.slug)}
                  className="rounded-full border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
