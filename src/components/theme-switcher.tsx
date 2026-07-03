"use client";

import { useRouter } from "next/navigation";

import type { Theme } from "@/lib/theme";

type ThemeSwitcherProps = {
  theme: Theme;
};

export function ThemeSwitcher({ theme }: ThemeSwitcherProps) {
  const router = useRouter();

  async function ensureLightTheme() {
    if (theme === "light") {
      return;
    }

    const response = await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: "light" }),
    });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={ensureLightTheme}
      className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
      title="Light mode"
    >
      ☀️
    </button>
  );
}
