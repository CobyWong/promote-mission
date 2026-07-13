"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ResetPasswordFormProps = {
  locale: Locale;
};

type RecoveryState = "checking" | "ready" | "invalid";

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

    const hash = window.location.hash;
    if (!hash.startsWith("#")) {
      setRecoveryState("invalid");
      setError(t.invalidLink);
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const hashError = params.get("error") || params.get("error_description");

    if (hashError) {
      setRecoveryState("invalid");
      setError(t.invalidLink);
      return;
    }

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setRecoveryState("invalid");
      setError(t.invalidLink);
      return;
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setRecoveryState("invalid");
          setError(t.invalidLink);
          return;
        }

        // Avoid leaving auth tokens in URL hash after session is established.
        window.history.replaceState(null, "", "/reset-password");
        setRecoveryState("ready");
      })
      .catch(() => {
        setRecoveryState("invalid");
        setError(t.invalidLink);
      });
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
            <label className="block text-sm text-slate-200">
              {t.newPassword}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type={showNewPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-500/70 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/60"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="rounded-xl border border-slate-500/70 bg-slate-900/60 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60"
                >
                  {showNewPassword ? t.hidePassword : t.showPassword}
                </button>
              </div>
            </label>

            <label className="block text-sm text-slate-200">
              {t.confirmPassword}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-500/70 bg-slate-900/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/60"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="rounded-xl border border-slate-500/70 bg-slate-900/60 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60"
                >
                  {showConfirmPassword ? t.hidePassword : t.showPassword}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="tactical-btn-primary mt-2 w-full px-5 py-3 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>
        ) : null}

        <div className="mt-6">
          <Link href="/login" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            {t.goLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
