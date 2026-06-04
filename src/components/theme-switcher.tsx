"use client";

import { useRouter } from "next/navigation";

import type { Theme } from "@/lib/theme";

type ThemeSwitcherProps = {
  theme: Theme;
};

export function ThemeSwitcher({ theme }: ThemeSwitcherProps) {
  const router = useRouter();

  async function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";

    const response = await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-white/20 px-3 py-2 text-xs font-semibold transition hover:border-white/40"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
