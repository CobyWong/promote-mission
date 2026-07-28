import Link from "next/link";

import { getCurrentLocale } from "@/lib/i18n";
import { getSupportEmail } from "@/lib/supabase/env";

export default async function DataDeletionPage() {
  const locale = await getCurrentLocale();
  const supportEmail = getSupportEmail();

  const isEn = locale === "en";

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="glass-panel mx-auto max-w-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          {isEn ? "Data Deletion Instructions" : "資料刪除指示"}
        </h1>
        <p className="mt-4 text-slate-700">
          {isEn
            ? "You can request account and personal data deletion at any time."
            : "你可隨時要求刪除帳戶及個人資料。"}
        </p>

        <ol className="mt-6 list-decimal space-y-3 pl-5 text-slate-700">
          <li>
            {isEn
              ? "Send an email with subject 'Data Deletion Request' to"
              : "請以「資料刪除申請」為主旨，電郵至"}
            {" "}
            <a href={`mailto:${supportEmail}`} className="font-semibold text-cyan-700 underline underline-offset-4">
              {supportEmail}
            </a>
            。
          </li>
          <li>
            {isEn
              ? "Include your registered email and Instagram handle so we can verify ownership."
              : "請附上註冊電郵與 Instagram 帳號，方便我們驗證身份。"}
          </li>
          <li>
            {isEn
              ? "We will complete deletion within 7 business days and send confirmation."
              : "我們會在 7 個工作天內完成刪除並回覆確認。"}
          </li>
        </ol>

        <p className="mt-6 text-sm text-slate-500">
          {isEn
            ? "For policy details, please review our Privacy Policy and Terms of Service."
            : "詳情請參閱私隱政策及服務條款。"}
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/privacy" className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
            {isEn ? "Privacy Policy" : "私隱政策"}
          </Link>
          <Link href="/terms" className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700">
            {isEn ? "Terms of Service" : "服務條款"}
          </Link>
        </div>
      </div>
    </section>
  );
}
