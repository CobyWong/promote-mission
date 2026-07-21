import { getCurrentLocale } from "@/lib/i18n";
import Link from "next/link";

export async function Footer() {
  const locale = await getCurrentLocale();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-900">Mission One</p>
          <p>
            {locale === "en"
              ? "A creator platform for promotional missions, coin rewards, and real redemption."
              : "為創作者提供品牌宣傳任務、Coins 獎勵與正式兌換體驗。"}
          </p>
        </div>
        <p>
          {locale === "en"
            ? "IG Reels mission marketplace for creators and brands."
            : "面向創作者與品牌的 Instagram Reels 任務平台。"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard#support-center" className="font-semibold text-cyan-700 hover:text-cyan-800">
            {locale === "en" ? "Contact Support" : "聯絡客服"}
          </Link>
          <span className="text-slate-400">•</span>
          <Link href="/privacy" className="font-semibold text-slate-700 hover:text-slate-900">
            {locale === "en" ? "Privacy" : "私隱政策"}
          </Link>
          <span className="text-slate-400">•</span>
          <Link href="/terms" className="font-semibold text-slate-700 hover:text-slate-900">
            {locale === "en" ? "Terms" : "服務條款"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
