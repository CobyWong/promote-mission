"use client";

import { useEffect, useState } from "react";

type LeaderboardItem = {
  rank: number;
  name: string;
  rewardedInvites: number;
};

type LeaderboardResponse = {
  seasonKey: string;
  leaderboard: LeaderboardItem[];
};

export default function ReferralLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/referrals/leaderboard", { cache: "no-store" });
        if (!response.ok) {
          setError("Failed to load leaderboard.");
          return;
        }

        const payload = (await response.json()) as LeaderboardResponse;
        if (mounted) {
          setData(payload);
        }
      } catch {
        if (mounted) {
          setError("Failed to load leaderboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Referrals</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Season Leaderboard</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          Top creators by rewarded referrals this season.
        </p>
      </div>

      <div className="glass-panel mt-10 p-6">
        {loading ? <p className="text-slate-300">Loading leaderboard...</p> : null}
        {error ? <p className="text-rose-300">{error}</p> : null}

        {!loading && !error ? (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Season {data?.seasonKey ?? "-"}</p>
            <div className="mt-4 space-y-3">
              {(data?.leaderboard ?? []).map((item) => (
                <div key={`${item.rank}-${item.name}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">#{item.rank} {item.name}</p>
                    <p className="text-cyan-200">{item.rewardedInvites} rewarded</p>
                  </div>
                </div>
              ))}
              {(data?.leaderboard ?? []).length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300">No leaderboard entries yet this season.</p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
