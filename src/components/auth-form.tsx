"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { creatorOnboardingSteps } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath?: string;
  locale?: Locale;
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8";

export function AuthForm({ mode, nextPath = "/dashboard", locale = "zh-HK" }: AuthFormProps) {
  const isRegister = mode === "register";
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [niche, setNiche] = useState("");
  const [followersRange, setFollowersRange] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const backendReady = hasSupabaseConfig();
  const t = locale === "en"
    ? {
      networkError: "Unable to reach server. Please try again.",
    }
    : {
      networkError: "無法連線到伺服器，請再試一次。",
    };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError(locale === "en" ? "Supabase is not configured. Please set .env.local first." : "未設定 Supabase env，請先填好 .env.local 再登入／註冊。");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            data: {
              full_name: fullName,
              instagram_handle: instagramHandle,
              niche,
              followers_range: followersRange,
              portfolio_url: portfolioUrl || null,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setSubmitted(true);

        if (data.session) {
          router.push("/dashboard?editProfile=1");
          router.refresh();
        }

        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      const adminResponse = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (adminResponse.ok) {
        setSubmitted(true);
        window.location.assign("/admin/reviews");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(locale === "en" ? "Login succeeded, but the session could not be loaded." : "登入成功，但無法讀取 session。請再試一次。" );
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });

      if (!sessionResponse.ok) {
        const result = (await sessionResponse.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? (locale === "en" ? "Unable to save login session." : "無法儲存登入 session。"));
        return;
      }

      setSubmitted(true);
      window.location.assign(`/api/auth/redirect?next=${encodeURIComponent(nextPath)}`);
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div className="glass-panel p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          {isRegister ? (locale === "en" ? "Creator Sign Up" : "創作者註冊") : (locale === "en" ? "Welcome Back" : "歡迎回來")}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white">
          {isRegister
            ? locale === "en" ? "Create your creator account" : "建立你嘅 Creator 帳號"
            : locale === "en" ? "Sign in to continue" : "登入返嚟繼續接 mission"}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          {isRegister
            ? locale === "en"
              ? "Connect your Instagram profile and niche to get mission matches."
              : "連接 Instagram 帳號、填好 niche 同 audience，平台就可以幫你配對更啱嘅品牌任務。"
            : locale === "en"
              ? "Manage missions, submit proof, and track coin payouts after signing in."
              : "登入後即可管理接咗嘅任務、提交 proof，同追蹤 Coins 入帳狀態。"}
        </p>

        <div className="mt-8 space-y-3">
          {creatorOnboardingSteps.map((step, index) => (
            <div key={step} className="flex gap-4 rounded-2xl bg-white/5 p-4 text-slate-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-sm font-semibold text-cyan-200">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-8">
        {!backendReady ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            {locale === "en"
              ? "Backend mode is disabled. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first."
              : "Backend mode 未啟用。請先設定 `NEXT_PUBLIC_SUPABASE_URL` 同 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。"}
          </div>
        ) : null}

        {submitted ? (
          <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">Success</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              {isRegister ? (locale === "en" ? "Account created" : "帳號已建立") : (locale === "en" ? "Signed in" : "已成功登入")}
            </h2>
            <p className="mt-4 text-slate-200">
              {isRegister
                ? locale === "en"
                  ? "Account created. Continue to your dashboard."
                  : "帳號已建立，可以直接前往 dashboard。"
                : locale === "en"
                  ? "Go to your dashboard to continue mission work."
                  : "返去 dashboard 檢查進行中任務，同提交最新 proof。"}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="rounded-full bg-cyan-400 px-5 py-3 text-center font-semibold text-slate-950">
                {locale === "en" ? "Open Dashboard" : "去 Dashboard"}
              </Link>
              <Link href="/missions" className="rounded-full border border-white/15 px-5 py-3 text-center font-semibold text-white">
                {locale === "en" ? "View Missions" : "睇 Mission Center"}
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">
                  Full name
                  <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClassName} placeholder="Chloe Wong" />
                </label>
                <label className="block text-sm text-slate-300">
                  Instagram handle
                  <input required value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} className={inputClassName} placeholder="@chloe.creates" />
                </label>
              </div>
            ) : null}

            <label className="block text-sm text-slate-300">
              Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} placeholder="you@example.com" />
            </label>

            <label className="block text-sm text-slate-300">
              Password
              <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClassName} placeholder="••••••••" minLength={8} />
            </label>

            {isRegister ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm text-slate-300">
                    Content niche
                    <select required value={niche} onChange={(event) => setNiche(event.target.value)} className={inputClassName}>
                      <option value="" disabled>
                        Select niche
                      </option>
                      <option>Lifestyle</option>
                      <option>Beauty</option>
                      <option>Fitness</option>
                      <option>Tech</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    Followers range
                    <select required value={followersRange} onChange={(event) => setFollowersRange(event.target.value)} className={inputClassName}>
                      <option value="" disabled>
                        Select range
                      </option>
                      <option>1K - 5K</option>
                      <option>5K - 20K</option>
                      <option>20K - 50K</option>
                      <option>50K+</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm text-slate-300">
                  過往作品 / media kit link
                  <input value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} className={inputClassName} placeholder="https://drive.google.com/..." />
                </label>

                <label className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-4 text-sm text-slate-300">
                  <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                  <span>我同意平台審核提交內容，並確認會遵守品牌 brief、平台規則同任務發佈要求。</span>
                </label>
              </>
            ) : (
              <label className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-4 text-sm text-slate-300">
                <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                <span>記住我，方便下次快速登入。</span>
              </label>
            )}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button disabled={loading} className="w-full rounded-full bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
              {loading ? (locale === "en" ? "Processing..." : "處理中...") : isRegister ? (locale === "en" ? "Create account" : "建立帳號") : (locale === "en" ? "Sign in" : "登入平台")}
            </button>

            <p className="text-center text-sm text-slate-400">
              {isRegister ? (locale === "en" ? "Already have an account?" : "已經有帳號？") : (locale === "en" ? "No account yet?" : "未有帳號？")}{" "}
              <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-cyan-300">
                {isRegister ? (locale === "en" ? "Go to login" : "去 Login") : (locale === "en" ? "Register now" : "立即註冊")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
