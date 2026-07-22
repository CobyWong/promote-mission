"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n";
import { getAdminEmails } from "@/lib/supabase/env";

type AdminLoginFormProps = {
  locale: Locale;
  nextPath?: string;
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400";

export function AdminLoginForm({ locale, nextPath = "/admin/reviews" }: AdminLoginFormProps) {
  const adminEmailPlaceholder = getAdminEmails()[0] ?? "admin@example.com";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = locale === "en"
    ? {
      title: "Admin sign in",
      subtitle: "Separate admin interface",
      hint: "Use the admin account to access admin and brand consoles.",
      email: "Admin email",
      password: "Password",
      submit: "Sign in as admin",
      processing: "Processing...",
      failed: "Login failed. Please check credentials.",
      networkError: "Unable to reach server. Please try again.",
    }
    : {
      title: "管理員登入",
      subtitle: "獨立管理介面",
      hint: "請使用管理員帳號登入以進入 admin / brand 管理後台。",
      email: "管理員 Email",
      password: "密碼",
      submit: "以管理員身份登入",
      processing: "處理中...",
      failed: "登入失敗，請檢查帳號密碼。",
      networkError: "無法連線到伺服器，請再試一次。",
    };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        let result: { error?: string } | null = null;

        try {
          result = (await response.json()) as { error?: string };
        } catch {
          result = null;
        }

        setError(result?.error ?? t.failed);
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl glass-panel p-8">
      <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t.subtitle}</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900">{t.title}</h1>
      <p className="mt-4 text-sm text-slate-600">{t.hint}</p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <label className="block text-sm text-slate-700">
          {t.email}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} placeholder={adminEmailPlaceholder} />
        </label>

        <label className="block text-sm text-slate-700">
          {t.password}
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClassName} placeholder="••••••••" />
        </label>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <button
          disabled={loading}
          className="tactical-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? t.processing : t.submit}
        </button>
      </form>
    </div>
  );
}
