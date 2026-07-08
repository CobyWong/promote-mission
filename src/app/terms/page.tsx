import { getCurrentLocale } from "@/lib/i18n";

export default async function TermsPage() {
  const locale = await getCurrentLocale();
  const isEn = locale === "en";

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="tactical-section-kicker">{isEn ? "Legal" : "法律"}</p>
        <h1 className="tactical-section-title">{isEn ? "Terms of Service" : "服務條款"}</h1>

        <div className="glass-panel space-y-5 p-6 text-sm leading-7 text-slate-300 sm:p-8">
          <p>
            {isEn
              ? "By using Mission One, you agree to comply with campaign rules, platform policies, and applicable laws."
              : "使用 Mission One 即代表你同意遵守活動規則、平台政策及適用法律。"}
          </p>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "Creator Responsibilities" : "創作者責任"}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{isEn ? "Provide accurate account information and submission content." : "提供準確的帳戶資料及提交內容。"}</li>
              <li>{isEn ? "Follow mission brief requirements and disclosure expectations." : "遵守任務簡報要求及披露規範。"}</li>
              <li>{isEn ? "Do not abuse endpoints, exploit rewards, or submit fraudulent content." : "不得濫用 API、套利獎勵或提交虛假內容。"}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "Review and Rewards" : "審核與獎勵"}</h2>
            <p className="mt-2">
              {isEn
                ? "Submissions are reviewed before rewards are issued. Reward redemption can be rejected for policy violations, abuse signals, or insufficient balance/eligibility."
                : "提交內容需先經審核才會發放獎勵。若出現違規、濫用信號或餘額/資格不足，平台可拒絕兌換。"}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "Service Availability" : "服務可用性"}</h2>
            <p className="mt-2">
              {isEn
                ? "We may perform maintenance, security controls, and temporary restrictions to protect reliability and users."
                : "為保障可靠性及用戶安全，平台可進行維護、安全控制及暫時限制。"}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "Enforcement" : "執行"}</h2>
            <p className="mt-2">
              {isEn
                ? "Mission One may suspend access or reverse rewards when abuse, fraud, or severe policy violations are confirmed."
                : "如確認濫用、詐騙或嚴重違規，Mission One 可暫停帳戶或回收獎勵。"}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            {isEn
              ? "Last updated: 2026-07-08"
              : "最後更新：2026-07-08"}
          </p>
        </div>
      </div>
    </section>
  );
}
