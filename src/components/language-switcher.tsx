"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";

type LanguageSwitcherProps = {
  locale: Locale;
};

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function updateLanguage(nextLocale: Locale) {
    await fetch("/api/language", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale: nextLocale }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 text-sm font-semibold tracking-[0.02em] text-slate-300">
      <button
        type="button"
        onClick={() => updateLanguage("zh-HK")}
        disabled={isPending}
        className={`min-w-16 rounded-full px-4 py-1.5 text-center transition ${locale === "zh-HK" ? "bg-cyan-400 text-slate-950" : "hover:text-white"}`}
      >
        繁中
      </button>
      <button
        type="button"
        onClick={() => updateLanguage("en")}
        disabled={isPending}
        className={`min-w-16 rounded-full px-4 py-1.5 text-center transition ${locale === "en" ? "bg-cyan-400 text-slate-950" : "hover:text-white"}`}
      >
        EN
      </button>
    </div>
  );
}
