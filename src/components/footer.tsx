import { getCurrentLocale } from "@/lib/i18n";
import Link from "next/link";

export async function Footer() {
  const locale = await getCurrentLocale();

  return (
    <footer className="mt-16 border-t border-white/10 bg-slate-950/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-300 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-100">Mission One</p>
          <p>
            {locale === "en"
              ? "A creator platform for promotional missions, coin rewards, and real redemption."
              : "為創作者提供產品宣傳任務、Coins 獎勵同真實兌換體驗。"}
          </p>
        </div>
        <p>
          {locale === "en"
            ? "IG Reels mission marketplace for creators and brands."
            : "面向創作者同品牌嘅 IG Reels 任務平台。"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard#support-center" className="font-semibold text-cyan-300 hover:text-cyan-200">
            {locale === "en" ? "Contact Support" : "聯絡客服"}
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/privacy" className="font-semibold text-slate-300 hover:text-white">
            {locale === "en" ? "Privacy" : "私隱政策"}
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/terms" className="font-semibold text-slate-300 hover:text-white">
            {locale === "en" ? "Terms" : "服務條款"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
