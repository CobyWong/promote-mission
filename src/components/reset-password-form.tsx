"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ResetPasswordFormProps = {
  locale: Locale;
};

type RecoveryState = "checking" | "ready" | "invalid";

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A11.1 11.1 0 0 1 12 5c6.4 0 10 7 10 7a18.7 18.7 0 0 1-4 4.9" />
      <path d="M6.6 6.7C3.9 8.3 2 12 2 12s3.6 6 10 6a10.8 10.8 0 0 0 4.2-.8" />
    </svg>
  );
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [navigatingLogin, setNavigatingLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        title: "Reset password",
        subtitle: "Set a new password for your account.",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        submit: "Update password",
        submitting: "Updating...",
        goLogin: "Back to login",
        passwordTooShort: "Password must be at least 8 characters.",
        mismatch: "Passwords do not match.",
        invalidLink: "Recovery link is invalid or expired. Please request a new password reset email.",
        noSupabase: "Supabase is not configured.",
        success: "Password updated successfully. You can now log in with the new password.",
        showPassword: "Show",
        hidePassword: "Hide",
      };
    }

    return {
      title: "重設密碼",
      subtitle: "請為帳戶設定新密碼。",
      newPassword: "新密碼",
      confirmPassword: "確認新密碼",
      submit: "更新密碼",
      submitting: "更新中...",
      goLogin: "返回登入",
      passwordTooShort: "密碼最少需要 8 個字元。",
      mismatch: "兩次輸入的密碼不一致。",
      invalidLink: "重設連結無效或已過期，請重新發送重設密碼電郵。",
      noSupabase: "Supabase 尚未設定。",
      success: "密碼已成功更新，請使用新密碼重新登入。",
      showPassword: "顯示",
      hidePassword: "隱藏",
    };
  }, [locale]);

  useEffect(() => {
    if (!supabase) {
      setRecoveryState("invalid");
      setError(t.noSupabase);
      return;
    }
    const client = supabase;

    let cancelled = false;

    async function resolveRecoveryState() {
      const hash = window.location.hash;

      if (hash.startsWith("#")) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");
        const hashError = params.get("error") || params.get("error_description");

        if (hashError) {
          if (!cancelled) {
            setRecoveryState("invalid");
            setError(t.invalidLink);
          }
          return;
        }

        if (type === "recovery" && accessToken && refreshToken) {
          const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

          if (sessionError) {
            if (!cancelled) {
              setRecoveryState("invalid");
              setError(t.invalidLink);
            }
            return;
          }

          // Avoid leaving auth tokens in URL hash after session is established.
          window.history.replaceState(null, "", "/reset-password");
          if (!cancelled) {
            setRecoveryState("ready");
            setError(null);
          }
          return;
        }
      }

      // Support recovery flows that exchange code on /auth/callback first and then
      // redirect to /reset-password without URL hash tokens.
      const { data } = await client.auth.getSession();
      if (data.session) {
        if (!cancelled) {
          setRecoveryState("ready");
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setRecoveryState("invalid");
        setError(t.invalidLink);
      }
    }

    resolveRecoveryState().catch(() => {
      if (!cancelled) {
        setRecoveryState("invalid");
        setError(t.invalidLink);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, t.invalidLink, t.noSupabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!supabase) {
      setError(t.noSupabase);
      return;
    }

    if (newPassword.length < 8) {
      setError(t.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(t.success);
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackToLogin() {
    setNavigatingLogin(true);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="tactical-card p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-slate-100">{t.title}</h1>
        <p className="mt-2 text-slate-300">{t.subtitle}</p>

        {recoveryState === "checking" ? (
          <p className="mt-6 text-sm text-slate-300">{locale === "en" ? "Validating reset link..." : "正在驗證重設連結..."}</p>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-rose-300/35 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-300/35 bg-emerald-300/12 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        {recoveryState === "ready" ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-800">
              {t.newPassword}
              <div className="relative mt-2">
                <input
                  type={showNewPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  aria-label={showNewPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-cyan-700"
                >
                  {showNewPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </label>

            <label className="block text-sm text-slate-800">
              {t.confirmPassword}
              <div className="relative mt-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-cyan-700"
                >
                  {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl border border-[#1f5cc7] bg-[#1f5cc7] px-5 py-3 font-semibold text-white transition hover:border-[#184ca4] hover:bg-[#184ca4] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>
        ) : null}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={navigatingLogin}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {t.goLogin}
          </button>
        </div>
      </div>
    </div>
  );
}
