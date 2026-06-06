"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Mission } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type BrandMissionManagerProps = {
  initialMissions: Mission[];
  locale: Locale;
};

export function BrandMissionManager({ initialMissions, locale }: BrandMissionManagerProps) {
  const t = locale === "en"
    ? {
      refreshFailed: "Unable to refresh mission list.",
      saveFailed: "Failed to save mission.",
      deleteFailed: "Failed to delete mission.",
      editMission: "Edit mission",
      createMission: "Create new mission",
      processing: "Processing...",
      updateMission: "Update mission",
      createMissionBtn: "Create mission",
      cancelEdit: "Cancel edit",
      requirementsPerLine: "Requirements (one per line)",
      deliverablesPerLine: "Deliverables (one per line)",
      tagsComma: "Tags (comma separated)",
      description: "Description",
      hook: "Hook",
      fieldSlug: "Slug",
      fieldTitle: "Title",
      fieldBrand: "Brand",
      fieldProduct: "Product",
      fieldRewardCoins: "Reward Coins",
      fieldDifficulty: "Difficulty",
      fieldEta: "ETA",
      fieldCategory: "Category",
      fieldDisplayOrder: "Display Order",
      fieldMinParticipants: "Min participants to unlock (0 = no limit)",
      fieldCurrentParticipants: "Current registered participants",
      coinsUnit: "Coins",
      edit: "Edit",
      delete: "Delete",
    }
    : {
      refreshFailed: "無法更新任務清單。",
      saveFailed: "儲存任務失敗。",
      deleteFailed: "刪除任務失敗。",
      editMission: "編輯任務",
      createMission: "建立新任務",
      processing: "處理中...",
      updateMission: "更新任務",
      createMissionBtn: "建立任務",
      cancelEdit: "取消編輯",
      requirementsPerLine: "任務要求（每行一項）",
      deliverablesPerLine: "提交內容（每行一項）",
      tagsComma: "標籤（用逗號分隔）",
      description: "任務描述",
      hook: "拍片 Hook 建議",
      fieldSlug: "Slug",
      fieldTitle: "標題",
      fieldBrand: "品牌",
      fieldProduct: "產品",
      fieldRewardCoins: "任務獎勵（金幣）",
      fieldDifficulty: "難度",
      fieldEta: "交稿時限",
      fieldCategory: "分類",
      fieldDisplayOrder: "顯示排序",
      fieldMinParticipants: "最低開放人數（0＝不限）",
      fieldCurrentParticipants: "目前登記人數",
      coinsUnit: "金幣",
      edit: "編輯",
      delete: "刪除",
    };

  const router = useRouter();
  const [missions, setMissions] = useState(initialMissions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    brand: "",
    product: "",
    points: 1000,
    difficulty: "Easy",
    eta: "1 day",
    category: "General",
    description: "",
    hook: "",
    requirements: "",
    deliverables: "",
    tags: "",
    displayOrder: 0,
    minParticipants: 0,
    currentParticipants: 0,
  });

  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  async function refreshFromServer() {
    const response = await fetch("/api/brand/missions");
    const result = (await response.json()) as { missions?: Mission[]; error?: string };

    if (!response.ok) {
      setError(result.error ?? t.refreshFailed);
      return;
    }

    setMissions(result.missions ?? []);
    router.refresh();
  }

  async function submitCreateOrUpdate() {
    setError(null);
    setLoading(true);

    const payload = {
      slug: form.slug,
      title: form.title,
      brand: form.brand,
      product: form.product,
      reward_coins: Number(form.points),
      difficulty: form.difficulty,
      eta: form.eta,
      category: form.category,
      description: form.description,
      hook: form.hook,
      requirements: form.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
      deliverables: form.deliverables.split("\n").map((item) => item.trim()).filter(Boolean),
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
      display_order: Number(form.displayOrder),
      is_active: true,
      min_participants: Number(form.minParticipants),
      current_participants: Number(form.currentParticipants),
    };

    const response = await fetch(editingSlug ? `/api/brand/missions/${editingSlug}` : "/api/brand/missions", {
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
      title: "",
      brand: "",
      product: "",
      points: 1000,
      difficulty: "Easy",
      eta: "1 day",
      category: "General",
      description: "",
      hook: "",
      requirements: "",
      deliverables: "",
      tags: "",
      displayOrder: 0,
      minParticipants: 0,
      currentParticipants: 0,
    });
    setEditingSlug(null);
    setLoading(false);
    await refreshFromServer();
  }

  async function deleteMission(slug: string) {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/brand/missions/${slug}`, {
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
        <h2 className="text-2xl font-semibold text-white">{editingSlug ? `${t.editMission}: ${editingSlug}` : t.createMission}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { key: "slug", label: t.fieldSlug, type: "text" },
            { key: "title", label: t.fieldTitle, type: "text" },
            { key: "brand", label: t.fieldBrand, type: "text" },
            { key: "product", label: t.fieldProduct, type: "text" },
            { key: "points", label: t.fieldRewardCoins, type: "number" },
            { key: "difficulty", label: t.fieldDifficulty, type: "text" },
            { key: "eta", label: t.fieldEta, type: "text" },
            { key: "category", label: t.fieldCategory, type: "text" },
            { key: "displayOrder", label: t.fieldDisplayOrder, type: "number" },
            { key: "minParticipants", label: t.fieldMinParticipants, type: "number" },
            { key: "currentParticipants", label: t.fieldCurrentParticipants, type: "number" },
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

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-slate-300">
            {t.description}
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-slate-300">
            {t.hook}
            <textarea value={form.hook} onChange={(event) => setForm((current) => ({ ...current, hook: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-slate-300">
            {t.requirementsPerLine}
            <textarea value={form.requirements} onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
          </label>
          <label className="block text-sm text-slate-300">
            {t.deliverablesPerLine}
            <textarea value={form.deliverables} onChange={(event) => setForm((current) => ({ ...current, deliverables: event.target.value }))} className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
          </label>
        </div>

        <label className="mt-4 block text-sm text-slate-300">
          {t.tagsComma}
          <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white" />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={submitCreateOrUpdate} disabled={loading} className="rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
            {loading ? t.processing : editingSlug ? t.updateMission : t.createMissionBtn}
          </button>
          {editingSlug ? (
            <button
              type="button"
              onClick={() => {
                setEditingSlug(null);
                setForm((current) => ({ ...current, slug: "" }));
              }}
              className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white"
            >
              {t.cancelEdit}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        {missions.map((mission) => (
          <div key={mission.slug} className="glass-panel p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-400">{mission.slug}</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{mission.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{mission.brand} · {mission.points} {t.coinsUnit} · {mission.category}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(mission.slug);
                    setForm({
                      slug: mission.slug,
                      title: mission.title,
                      brand: mission.brand,
                      product: mission.product,
                      points: mission.points,
                      difficulty: mission.difficulty,
                      eta: mission.eta,
                      category: mission.category,
                      description: mission.description,
                      hook: mission.hook,
                      requirements: mission.requirements.join("\n"),
                      deliverables: mission.deliverables.join("\n"),
                      tags: mission.tags.join(", "),
                      displayOrder: mission.displayOrder ?? 0,
                      minParticipants: mission.minParticipants ?? 0,
                      currentParticipants: mission.currentParticipants ?? 0,
                    });
                  }}
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200"
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  onClick={() => deleteMission(mission.slug)}
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
