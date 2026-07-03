"use client";

import { useMemo, useState } from "react";

type SupportContactFormProps = {
  locale: "zh-HK" | "en";
  defaultEmail: string;
  supportEmail: string;
  supportWhatsappUrl: string | null;
};

type SubmitState = {
  loading: boolean;
  error: string | null;
  ticketId: string | null;
};

const categories = ["General", "Login", "Mission", "Rewards", "Payment", "Bug"] as const;

export function SupportContactForm({ locale, defaultEmail, supportEmail, supportWhatsappUrl }: SupportContactFormProps) {
  const t = useMemo(
    () => (locale === "en"
      ? {
        title: "Contact Support",
        subtitle: "Have an issue? Send us a message and our support team will follow up by email.",
        name: "Name",
        email: "Email",
        category: "Issue type",
        message: "Describe your problem",
        placeholder: "Tell us what happened, what page you were on, and any error message.",
        submit: "Send support request",
        sending: "Sending...",
        success: "Request sent. Your ticket number is",
        fallback: "If form submission fails, contact us directly:",
        whatsapp: "Chat on WhatsApp",
      }
      : {
        title: "聯絡客服",
        subtitle: "遇到問題可以直接提交訊息，我哋客服會透過電郵跟進。",
        name: "稱呼",
        email: "電郵",
        category: "問題類型",
        message: "問題描述",
        placeholder: "請寫低你遇到嘅情況、所在頁面同錯誤訊息。",
        submit: "送出客服請求",
        sending: "送出中...",
        success: "已送出，你嘅客服編號係",
        fallback: "如果表單暫時送唔到，可以直接聯絡：",
        whatsapp: "WhatsApp 聯絡",
      }),
    [locale],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [category, setCategory] = useState<(typeof categories)[number]>("General");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>({
    loading: false,
    error: null,
    ticketId: null,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setState({ loading: true, error: null, ticketId: null });

    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        category,
        message,
        pagePath: typeof window !== "undefined" ? window.location.pathname : null,
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string; ticketId?: string } | null;

    if (!response.ok) {
      setState({
        loading: false,
        error: result?.error ?? "Unable to send your request right now.",
        ticketId: null,
      });
      return;
    }

    setState({ loading: false, error: null, ticketId: result?.ticketId ?? null });
    setMessage("");
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold text-slate-900">{t.title}</h1>
      <p className="mt-3 text-slate-600">{t.subtitle}</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>{t.name}</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span>{t.email}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span>{t.category}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-300"
          >
            {categories.map((item) => (
              <option key={item} value={item} className="text-slate-900">
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          <span>{t.message}</span>
          <textarea
            required
            minLength={10}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t.placeholder}
            className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={state.loading}
            className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {state.loading ? t.sending : t.submit}
          </button>

          <a
            href={`mailto:${supportEmail}`}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            {supportEmail}
          </a>

          {supportWhatsappUrl ? (
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              {t.whatsapp}
            </a>
          ) : null}
        </div>
      </form>

      {state.error ? (
        <p className="mt-4 text-sm text-amber-700">{state.error}</p>
      ) : null}

      {state.ticketId ? (
        <p className="mt-4 text-sm text-blue-700">
          {t.success}: <span className="font-semibold">{state.ticketId}</span>
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-500">
        {t.fallback} <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>
    </div>
  );
}
