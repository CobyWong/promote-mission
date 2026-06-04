"use client";

import { useRouter } from "next/navigation";

import type { Locale } from "@/lib/i18n";

type AdminSessionButtonProps = {
  locale: Locale;
};

export function AdminSessionButton({ locale }: AdminSessionButtonProps) {
  const router = useRouter();

  const label = locale === "en" ? "Admin logout" : "管理員登出";

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
      className="hidden rounded-full border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-cyan-300/50 hover:text-cyan-200 sm:inline-flex"
    >
      {label}
    </button>
  );
}
