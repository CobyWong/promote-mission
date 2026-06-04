"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InstagramSyncButtonProps = {
  label: string;
  syncingLabel: string;
  successLabel: string;
};

export function InstagramSyncButton({ label, syncingLabel, successLabel }: InstagramSyncButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setMessage(null);
          setError(null);

          const response = await fetch("/api/instagram/sync", {
            method: "POST",
          });

          const payload = (await response.json()) as { synced?: number; error?: string };

          if (!response.ok) {
            setError(payload.error ?? "Sync failed.");
            setLoading(false);
            return;
          }

          setMessage(`${successLabel}: ${payload.synced ?? 0}`);
          setLoading(false);
          router.refresh();
        }}
        className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:border-cyan-300 enabled:hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? syncingLabel : label}
      </button>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
