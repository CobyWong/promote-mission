import { getCurrentLocale } from "@/lib/i18n";
import Link from "next/link";

export async function Footer() {
  const locale = await getCurrentLocale();

  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-200">Promote Mission</p>
          <p>
            {locale === "en"
              ? "A creator platform for promotional missions, coin rewards, and real redemption."
              : "為創作者提供產品宣傳任務、Coins 獎勵同真實兌換體驗。"}
          </p>
        </div>
        <p>
          {locale === "en"
            ? "Prototype experience for an IG Reels mission marketplace."
            : "IG Reels 任務平台原型體驗。"}
        </p>
        <Link href="/support" className="text-cyan-300 hover:text-cyan-200">
          {locale === "en" ? "Contact Support" : "聯絡客服"}
        </Link>
      </div>
    </footer>
  );
}
