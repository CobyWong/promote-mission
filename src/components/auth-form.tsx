"use client";

import { useState } from "react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type AuthFormProps = {
  mode: "login" | "register";
  locale?: Locale;
};

const registerNiches = [
  { value: "Beauty", labelZh: "美容與化妝品", labelEn: "Beauty" },
  { value: "Food", labelZh: "美食與餐飲", labelEn: "Food" },
  { value: "Tech", labelZh: "科技與產品", labelEn: "Tech" },
  { value: "Lifestyle", labelZh: "生活風格", labelEn: "Lifestyle" },
  { value: "Fashion", labelZh: "時尚與穿搭", labelEn: "Fashion" },
  { value: "Fitness", labelZh: "健身與健康", labelEn: "Fitness" },
  { value: "Travel", labelZh: "旅遊", labelEn: "Travel" },
  { value: "Gaming", labelZh: "遊戲", labelEn: "Gaming" },
  { value: "Finance", labelZh: "金融與金融科技", labelEn: "Finance" },
  { value: "Education", labelZh: "教育", labelEn: "Education" },
];

const registerLanguages = ["Cantonese", "English", "Mandarin", "Japanese", "Korean"];

const registerRegions = ["Hong Kong", "Macau", "Taiwan", "Singapore", "Malaysia", "Japan", "Korea", "USA", "UK", "Australia", "Other"];

const registerGenders = ["男", "女", "其他", "不願透露"];
const registerAgeGroups = ["<12", "12-18", "18-24", "25-34", "35-44", "45+"];
const registerFollowerBands = ["0-1000", "1K-5K", "5K-10K", "10K-20K", "20K-50K", "50K-100K", "100K+"];

const lightInputClassName =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400";

function toggleChip(list: string[], value: string, maxSelection = 99) {
  if (list.includes(value)) {
    return list.filter((item) => item !== value);
  }

  if (list.length >= maxSelection) {
    return list;
  }

  return [...list, value];
}

export function AuthForm({ mode, locale = "zh-HK" }: AuthFormProps) {
  const isRegister = mode === "register";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const niche = "";
  const portfolioUrl = "";
  const [phoneRegion, setPhoneRegion] = useState("HK (+852)");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [followersRange, setFollowersRange] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const backendReady = hasSupabaseConfig();
  const t = locale === "en"
    ? {
      networkError: "Unable to reach server. Please try again.",
      registerTitle: "Set up your profile",
      registerSubtitle: "A few simple steps to unlock missions and payouts.",
      continue: "Continue",
      back: "Back",
      create: "Create account",
      stepBasic: "Basic info",
      stepInstagram: "Instagram",
      stepCoverage: "Content coverage",
      stepAudience: "Audience profile",
      stepFinal: "Finish",
      stepOf: "Step",
      ofTotal: "of 5",
      name: "Creator name",
      phone: "Phone",
      bio: "Bio",
      instagram: "Instagram username",
      instagramHint: "Paste @handle or profile URL. We will auto-extract your username.",
      niches: "Content niches",
      nicheHint: "Choose 2-5 categories that fit your content.",
      languages: "Languages",
      regions: "Coverage regions",
      gender: "Gender",
      age: "Age group",
      followersBand: "Follower band",
      referral: "Referral code (optional)",
      termsPrefix: "I agree to the",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy",
      needTwoNiches: "Please select at least 2 content niches.",
      needBasic: "Please complete name, email, and password.",
      needInstagram: "Please provide your Instagram username.",
      needAudience: "Please select gender, age group, and follower band.",
      needTerms: "Please agree to the service terms.",
    }
    : {
      networkError: "無法連線到伺服器，請再試一次。",
      registerTitle: "設定你的個人檔案",
      registerSubtitle: "幾個簡單步驟即可解鎖活動同提款。",
      continue: "繼續",
      back: "返回",
      create: "建立帳戶",
      stepBasic: "基本資料",
      stepInstagram: "Instagram",
      stepCoverage: "內容覆蓋範圍",
      stepAudience: "受眾資料",
      stepFinal: "完成設定",
      stepOf: "第",
      ofTotal: "步，共 5 步",
      name: "創作者名稱",
      phone: "電話號碼",
      bio: "個人簡介",
      instagram: "Instagram 用戶名稱",
      instagramHint: "可以貼上 @帳號或個人檔案 URL，系統會自動提取帳號名稱。",
      niches: "內容範疇",
      nicheHint: "請選擇 2-5 個最符合你內容的範疇。",
      languages: "語言",
      regions: "覆蓋地區",
      gender: "性別",
      age: "年齡組別",
      followersBand: "追蹤數區間",
      referral: "推薦碼（選填）",
      termsPrefix: "我同意",
      termsLink: "服務條款",
      and: "及",
      privacyLink: "私隱政策",
      needTwoNiches: "請至少選擇 2 個內容範疇。",
      needBasic: "請先填妥名稱、電郵及密碼。",
      needInstagram: "請填寫 Instagram 用戶名稱。",
      needAudience: "請選擇性別、年齡組別及追蹤數區間。",
      needTerms: "請先同意服務條款。",
    };

  const registerStepLabels = [t.stepBasic, t.stepInstagram, t.stepCoverage, t.stepAudience, t.stepFinal];

  function getHandleFromInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const match = trimmed.match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]+)/);
    return (match?.[1] ?? trimmed).replace(/^@/, "");
  }

  function validateCurrentRegisterStep() {
    if (registerStep === 1) {
      if (!fullName.trim() || !email.trim() || password.length < 8) {
        setError(t.needBasic);
        return false;
      }
    }

    if (registerStep === 2) {
      if (!getHandleFromInput(instagramHandle)) {
        setError(t.needInstagram);
        return false;
      }
    }

    if (registerStep === 3) {
      if (selectedNiches.length < 2) {
        setError(t.needTwoNiches);
        return false;
      }
    }

    if (registerStep === 4) {
      if (!gender || !ageGroup || !followersRange) {
        setError(t.needAudience);
        return false;
      }
    }

    if (registerStep === 5 && !agreedTerms) {
      setError(t.needTerms);
      return false;
    }

    return true;
  }

  function goNextRegisterStep() {
    setError(null);
    if (!validateCurrentRegisterStep()) {
      return;
    }

    setRegisterStep((step) => Math.min(step + 1, 5));
  }

  function goBackRegisterStep() {
    setError(null);
    setRegisterStep((step) => Math.max(step - 1, 1));
  }

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
        if (registerStep < 5) {
          goNextRegisterStep();
          return;
        }

        if (!validateCurrentRegisterStep()) {
          return;
        }

        const normalizedHandle = getHandleFromInput(instagramHandle);
        const derivedNiche = selectedNiches.join(" / ") || niche;
        const derivedFollowers = followersRange || "-";

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            data: {
              full_name: fullName,
              instagram_handle: normalizedHandle ? `@${normalizedHandle}` : null,
              niche: derivedNiche,
              followers_range: derivedFollowers,
              portfolio_url: portfolioUrl || null,
              phone_region: phoneRegion,
              phone_number: phoneNumber,
              bio,
              languages: selectedLanguages,
              regions: selectedRegions,
              gender,
              age_group: ageGroup,
              account_type: "creator",
              referral_code: referralCode || null,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          window.location.assign("/api/auth/redirect?next=%2Fdashboard%3FeditProfile%3D1");
          return;
        }

        window.location.assign("/login?registered=1");

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
        // Also sign in via Supabase so the user session is active across all pages
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          if (signInData?.session) {
            await fetch("/api/auth/session", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: signInData.session.access_token,
                refresh_token: signInData.session.refresh_token,
              }),
            });
          }
        }
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

      window.location.assign("/api/auth/redirect?next=%2Fdashboard");
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      {!backendReady ? (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-700">
          {locale === "en"
            ? "Backend mode is disabled. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY first."
            : "Backend mode 未啟用。請先設定 NEXT_PUBLIC_SUPABASE_URL 同 NEXT_PUBLIC_SUPABASE_ANON_KEY。"}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <div>
                <h1 className="text-4xl font-semibold text-slate-900">{t.registerTitle}</h1>
                <p className="mt-3 text-lg text-slate-500">{t.registerSubtitle}</p>
              </div>

              <div className="flex items-end justify-between gap-3">
                <p className="text-xl text-slate-600">{registerStepLabels[registerStep - 1]}</p>
                <p className="text-xl text-slate-500">{t.stepOf} {registerStep} {t.ofTotal}</p>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${(registerStep / 5) * 100}%` }} />
              </div>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <div className="space-y-6 p-8">
                  {registerStep === 1 ? (
                    <>
                      <label className="block text-base font-medium text-slate-900">
                        {t.name} <span className="text-rose-500">*</span>
                        <input
                          required
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className={lightInputClassName}
                          placeholder={locale === "en" ? "Your name" : "你的名稱"}
                        />
                      </label>

                      <label className="block text-base font-medium text-slate-900">
                        Email <span className="text-rose-500">*</span>
                        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={lightInputClassName} placeholder="you@example.com" />
                      </label>

                      <label className="block text-base font-medium text-slate-900">
                        Password <span className="text-rose-500">*</span>
                        <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={lightInputClassName} placeholder="********" minLength={8} />
                      </label>

                      <div>
                        <p className="text-base font-medium text-slate-900">{t.phone}</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-[220px_1fr]">
                          <select value={phoneRegion} onChange={(event) => setPhoneRegion(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400">
                            <option>HK (+852)</option>
                            <option>MO (+853)</option>
                            <option>TW (+886)</option>
                            <option>SG (+65)</option>
                          </select>
                          <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400" placeholder="9123 4567" />
                        </div>
                      </div>

                      <label className="block text-base font-medium text-slate-900">
                        {t.bio}
                        <textarea value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 min-h-36 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400" placeholder={locale === "en" ? "Tell brands about your style and audience..." : "介紹你的內容風格、受眾，以及你的 Reels 有什麼特色..."} />
                      </label>
                    </>
                  ) : null}

                  {registerStep === 2 ? (
                    <>
                      <label className="block text-2xl font-semibold text-slate-900">
                        {t.instagram}
                        <p className="mt-2 text-base font-normal text-slate-500">{t.instagramHint}</p>
                        <input value={instagramHandle} onChange={(event) => setInstagramHandle(event.target.value)} className={lightInputClassName} placeholder="yourhandle" />
                      </label>
                    </>
                  ) : null}

                  {registerStep === 3 ? (
                    <>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.niches}</h3>
                        <p className="mt-2 text-sm text-slate-500">{t.nicheHint}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {registerNiches.map((item) => {
                            const label = locale === "en" ? item.labelEn : item.labelZh;
                            const selected = selectedNiches.includes(item.value);
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => setSelectedNiches((prev) => toggleChip(prev, item.value, 5))}
                                className={`rounded-full border px-4 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.languages}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {registerLanguages.map((language) => {
                            const selected = selectedLanguages.includes(language);
                            return (
                              <button
                                key={language}
                                type="button"
                                onClick={() => setSelectedLanguages((prev) => toggleChip(prev, language))}
                                className={`rounded-full border px-4 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {language}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.regions}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {registerRegions.map((region) => {
                            const selected = selectedRegions.includes(region);
                            return (
                              <button
                                key={region}
                                type="button"
                                onClick={() => setSelectedRegions((prev) => toggleChip(prev, region))}
                                className={`rounded-full border px-4 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {region}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {registerStep === 4 ? (
                    <>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.gender} <span className="text-rose-500">*</span></h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {registerGenders.map((item) => {
                            const selected = gender === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setGender(item)}
                                className={`rounded-full border px-5 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.age} <span className="text-rose-500">*</span></h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {registerAgeGroups.map((item) => {
                            const selected = ageGroup === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setAgeGroup(item)}
                                className={`rounded-full border px-5 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{t.followersBand} <span className="text-rose-500">*</span></h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {registerFollowerBands.map((item) => {
                            const selected = followersRange === item;
                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setFollowersRange(item)}
                                className={`rounded-full border px-5 py-2 text-sm transition ${selected ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {registerStep === 5 ? (
                    <>
                      <label className="block text-base font-medium text-slate-900">
                        {t.referral}
                        <input value={referralCode} onChange={(event) => setReferralCode(event.target.value)} className={lightInputClassName} placeholder={locale === "en" ? "ABC123" : "輸入推薦碼（例如：ABC123）"} />
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-700">
                        <input checked={agreedTerms} onChange={(event) => setAgreedTerms(event.target.checked)} type="checkbox" className="h-5 w-5 rounded border-slate-400" />
                        <span>
                          {t.termsPrefix} {" "}
                          <Link href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-sky-300 hover:text-sky-200">
                            {t.termsLink}
                          </Link>{" "}
                          {t.and} {" "}
                          <Link href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-sky-300 hover:text-sky-200">
                            {t.privacyLink}
                          </Link>
                        </span>
                      </label>
                    </>
                  ) : null}

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-8 py-6">
                  <button
                    type="button"
                    onClick={goBackRegisterStep}
                    disabled={registerStep === 1 || loading}
                    className="text-lg font-semibold text-slate-700 disabled:opacity-40"
                  >
                    {t.back}
                  </button>

                  {registerStep < 5 ? (
                    <button
                      type="button"
                      onClick={goNextRegisterStep}
                      disabled={loading}
                      className="rounded-full bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {t.continue}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-full bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? (locale === "en" ? "Processing..." : "處理中...") : t.create}
                    </button>
                  )}
                </div>
              </section>

              <p className="text-center text-sm text-slate-500">
                {locale === "en" ? "Already have an account?" : "已有帳戶？"}{" "}
                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  {locale === "en" ? "Login" : "登入"}
                </Link>
              </p>
            </>
          ) : (
            <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h1 className="text-3xl font-semibold text-slate-900">{locale === "en" ? "Welcome back" : "歡迎回來"}</h1>
              <p className="mt-3 text-base text-slate-500">
                {locale === "en" ? "Sign in to continue your mission journey." : "登入後即可繼續管理任務及收益。"}
              </p>

              <div className="mt-6 space-y-4">
                <label className="block text-sm text-slate-700">
                  Email
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={lightInputClassName} placeholder="you@example.com" />
                </label>

                <label className="block text-sm text-slate-700">
                  Password
                  <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={lightInputClassName} placeholder="********" minLength={8} />
                </label>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}

                <button disabled={loading} className="w-full rounded-full bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? (locale === "en" ? "Processing..." : "處理中...") : (locale === "en" ? "Sign in" : "登入平台")}
                </button>

                <p className="text-center text-sm text-slate-500">
                  {locale === "en" ? "No account yet?" : "未有帳號？"}{" "}
                  <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                    {locale === "en" ? "Register now" : "立即註冊"}
                  </Link>
                </p>
              </div>
            </section>
          )}
      </form>
    </div>
  );
}
