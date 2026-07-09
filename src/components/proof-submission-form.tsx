"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Mission } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import {
  getMissionAcceptanceStorageKey,
  isMissionAcceptanceValid,
} from "@/lib/mission-acceptance";
import { getRankingRewardsByDifficulty } from "@/lib/mission-rules";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type ProofSubmissionFormProps = {
  mission: Mission;
  locale?: Locale;
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8";

export function ProofSubmissionForm({ mission, locale = "zh-HK" }: ProofSubmissionFormProps) {
  const isEnglish = locale === "en";
  const router = useRouter();
  const [reelUrl, setReelUrl] = useState("");
  const [captionSummary, setCaptionSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState({
    published: true,
    taggedBrand: false,
    addedCollaborator: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedAndValid, setAcceptedAndValid] = useState(false);
  const [acceptanceChecked, setAcceptanceChecked] = useState(false);
  const idempotencyKeyRef = useRef<string>("");
  const backendReady = hasSupabaseConfig();
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);

  const buildIdempotencyKey = () => {
    const base = `web-submission:${mission.slug}`;
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return `${base}:${crypto.randomUUID()}`;
    }

    return `${base}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  };

  useEffect(() => {
    const key = getMissionAcceptanceStorageKey(mission.slug);
    const refreshStatus = () => {
      const raw = window.localStorage.getItem(key);
      const acceptedAt = raw ? Number(raw) : NaN;
      const valid = !Number.isNaN(acceptedAt) && isMissionAcceptanceValid(acceptedAt, mission.eta);
      setAcceptedAndValid(valid);
      setAcceptanceChecked(true);
    };

    refreshStatus();
    const timer = window.setInterval(refreshStatus, 1000);
    window.addEventListener("storage", refreshStatus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", refreshStatus);
    };
  }, [mission.eta, mission.slug]);

  const completedChecks = useMemo(
    () => Object.values(checks).filter(Boolean).length,
    [checks],
  );

  const canSubmit = acceptedAndValid && reelUrl.trim().startsWith("http") && completedChecks === 3;

  if (submitted) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">{isEnglish ? "Submission sent" : "已完成提交"}</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{isEnglish ? "Proof submitted successfully" : "proof 已成功提交"}</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            {isEnglish
              ? `Your ${mission.brand} mission is now in the review queue. Rewards are settled from HK$${rewards.totalPrize.toLocaleString()} by likes ranking: #1 60%, #2 30%, #3 10%.`
              : `你的 ${mission.brand} 任務已進入審核隊列。獎勵將由 HK$${rewards.totalPrize.toLocaleString()} 獎金池按 Like 排名派發：第 1 名 60%、第 2 名 30%、第 3 名 10%。`}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">{isEnglish ? "Status" : "狀態"}</p>
              <p className="mt-2 font-semibold text-amber-300">{isEnglish ? "Pending review" : "待審核"}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">{isEnglish ? "Reward" : "獎勵"}</p>
              <p className="mt-2 font-semibold text-cyan-300">{`#1 HK$${rewards.first.toLocaleString()} · #2 HK$${rewards.second.toLocaleString()} · #3 HK$${rewards.third.toLocaleString()}`}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-slate-400">{isEnglish ? "Collaborator" : "協作者"}</p>
              <p className="mt-2 font-semibold text-white">@missionone_hk</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="rounded-full bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950">
              {isEnglish ? "Back to Dashboard" : "返回控制台"}
            </Link>
            <Link href="/admin/reviews" className="rounded-full border border-white/15 px-5 py-3 text-center font-semibold text-white">
              {isEnglish ? "View Admin Review Demo" : "查看後台審核示範"}
            </Link>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white">{isEnglish ? "Submission summary" : "提交摘要"}</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <div className="rounded-2xl bg-white/5 px-4 py-4">{isEnglish ? "Reel URL" : "Reels 連結"}: {reelUrl}</div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">{isEnglish ? "Submission ID" : "提交編號"}: {submissionId ?? (isEnglish ? "Pending assignment" : "等待分配")}</div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">{isEnglish ? "Collaborator" : "協作者"}: @missionone_hk</div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">{isEnglish ? "Caption summary" : "Caption 重點"}: {captionSummary || (isEnglish ? "Submitted" : "已提交")}</div>
            <div className="rounded-2xl bg-white/5 px-4 py-4">{isEnglish ? "Notes" : "備註"}: {notes || (isEnglish ? "None" : "無")}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <form
        className="glass-panel p-8"
        onSubmit={async (event) => {
          event.preventDefault();

          if (!acceptedAndValid) {
            setError(locale === "en" ? "Accept this mission first from the mission detail page." : "請先於任務詳情頁接受任務，再提交 Proof。");
            return;
          }

          if (!canSubmit) {
            return;
          }

          if (!backendReady) {
            setError(locale === "en" ? "Submission service is unavailable until backend setup is complete." : "後端未完成設定，暫時未能提交。請稍後再試。");
            return;
          }

          setLoading(true);
          setError(null);

          if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = buildIdempotencyKey();
          }

          const formData = new FormData();
          formData.set("slug", mission.slug);
          formData.set("reelUrl", reelUrl);
          formData.set("captionSummary", captionSummary);
          formData.set("notes", notes);
          formData.set("checks", JSON.stringify(checks));

          const response = await fetch("/api/submissions", {
            method: "POST",
            headers: {
              "idempotency-key": idempotencyKeyRef.current,
            },
            body: formData,
          });

          const result = (await response.json()) as { error?: string; id?: string };

          if (!response.ok) {
            if (response.status === 409) {
              setError(locale === "en"
                ? "A matching submission is already processing. Wait a few seconds, refresh, then retry once."
                : "相同提交正在處理中，請等幾秒並重新整理後再試一次。");
            } else if (response.status === 429) {
              idempotencyKeyRef.current = "";
              setError(locale === "en"
                ? "Too many submit attempts. Pause briefly before trying again."
                : "提交次數過於頻繁，請稍等片刻後再試。");
            } else {
              idempotencyKeyRef.current = "";
              setError(result.error ?? (locale === "en" ? "Submission failed. Please try again." : "提交失敗，請稍後再試。"));
            }
            setLoading(false);
            if (response.status === 401) {
              router.push(`/login?next=/submit/${mission.slug}`);
            }
            return;
          }

          idempotencyKeyRef.current = "";
          setSubmissionId(result.id ?? null);
          setSubmitted(true);
          setLoading(false);
          router.refresh();
        }}
      >
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{isEnglish ? "Submission form" : "提交表單"}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{isEnglish ? `Submit ${mission.brand} proof` : `提交 ${mission.brand} proof`}</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {locale === "en"
            ? "Paste your reels link, add @missionone_hk as collaborator, and complete the checklist."
            : "請貼上 Reels 連結，並將 @missionone_hk 設為協作者，完成檢查清單後即可提交。"}
        </p>

        {acceptanceChecked && !acceptedAndValid ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            <p>
              {locale === "en"
                ? "You must accept this mission first before submitting proof."
                : "提交 Proof 前，必須先接受此任務。"}
            </p>
            <Link href={`/missions/${mission.slug}`} className="mt-3 inline-flex font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-4">
              {locale === "en" ? "Go to mission detail to accept ->" : "前往任務詳情接受任務 ->"}
            </Link>
          </div>
        ) : null}

        {!backendReady ? (
          <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            {locale === "en"
              ? "Backend mode is disabled. Configure Supabase to persist real submissions."
              : "後端模式尚未啟用。完成 Supabase 設定後，提交資料將正式寫入 submissions 資料表。"}
          </div>
        ) : null}

        <div className="mt-8 space-y-5">
          <label className="block text-sm text-slate-300">
            {isEnglish ? "IG Reels URL" : "IG Reels 連結"}
            <input
              required
              value={reelUrl}
              onChange={(event) => setReelUrl(event.target.value)}
              className={inputClassName}
              placeholder="https://instagram.com/reel/..."
            />
          </label>

          <label className="block text-sm text-slate-300">
            {isEnglish ? "Caption summary" : "Caption 重點"}
            <textarea
              value={captionSummary}
              onChange={(event) => setCaptionSummary(event.target.value)}
              className={`${inputClassName} min-h-28 resize-none`}
              placeholder="請說明內容如何呈現產品重點、CTA 與 hashtag"
            />
          </label>

          <label className="block text-sm text-slate-300">
            {isEnglish ? "Additional notes" : "補充備註"}
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${inputClassName} min-h-24 resize-none`}
              placeholder="例如：已將 @missionone_hk 設為協作者"
            />
          </label>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <p className="font-semibold text-white">{isEnglish ? "Checklist" : "檢查清單"}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {[
                { key: "published", label: isEnglish ? "Video is published publicly" : "影片已公開發佈" },
                { key: "taggedBrand", label: isEnglish ? "Brand account and hashtags are tagged" : "已標註品牌帳號與 hashtag" },
                { key: "addedCollaborator", label: isEnglish ? "@missionone.hk is added as collaborator" : "已將 @missionone_hk 設為協作者" },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-3 rounded-2xl bg-slate-950/60 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={checks[item.key as keyof typeof checks]}
                    onChange={(event) =>
                      setChecks((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            disabled={!canSubmit || loading}
            className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition enabled:hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {loading ? (locale === "en" ? "Submitting..." : "提交中...") : (locale === "en" ? "Submit proof" : "提交 Proof")}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white">{isEnglish ? "Mission summary" : "任務摘要"}</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>{isEnglish ? "Mission" : "任務"}</span>
              <span className="font-medium text-white">{mission.title}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>{isEnglish ? "Brand" : "品牌"}</span>
              <span className="font-medium text-white">{mission.brand}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>{isEnglish ? "Reward" : "獎勵"}</span>
              <span className="font-medium text-cyan-300">{`#1 HK$${rewards.first.toLocaleString()} · #2 HK$${rewards.second.toLocaleString()} · #3 HK$${rewards.third.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span>{isEnglish ? "Progress" : "進度"}</span>
              <span className="font-medium text-white">{completedChecks}/3 {isEnglish ? "ready" : "已完成"}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white">{isEnglish ? "Required deliverables" : "必交內容"}</h2>
          <ul className="mt-5 space-y-3 text-slate-300">
            {[
              isEnglish ? "Public Instagram Reels URL" : "公開 Instagram Reels 連結",
              isEnglish ? "Tag brand account and required hashtags" : "已標註品牌帳號及指定 hashtag",
              isEnglish ? "Add @missionone_hk as collaborator" : "已將 @missionone_hk 設為協作者",
            ].map((item) => (
              <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
