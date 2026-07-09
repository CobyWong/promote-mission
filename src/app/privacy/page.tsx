import { getCurrentLocale } from "@/lib/i18n";

export default async function PrivacyPage() {
  const locale = await getCurrentLocale();
  const isEn = locale === "en";

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="tactical-section-kicker">{isEn ? "Legal" : "法律"}</p>
        <h1 className="tactical-section-title">{isEn ? "Privacy Policy" : "私隱政策"}</h1>

        <div className="glass-panel space-y-5 p-6 text-sm leading-7 text-slate-300 sm:p-8">
          <p>
            {isEn
              ? "Mission One collects only the data required to provide creator missions, submission review, reward redemption, and support services."
              : "Mission One 僅收集提供創作者任務、提交審核、獎賞兌換及客服服務所需之資料。"}
          </p>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "What We Collect" : "我們收集什麼資料"}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{isEn ? "Account profile data (email, display name, optional creator fields)." : "帳戶資料（電郵、顯示名稱及可選創作者欄位）。"}</li>
              <li>{isEn ? "Mission activity data (acceptance, submission metadata, review status)." : "任務活動資料（接受、提交資訊、審核狀態）。"}</li>
              <li>{isEn ? "Reward and transaction data needed for redemption and audit." : "兌換及審計所需的獎賞與交易資料。"}</li>
              <li>{isEn ? "Operational logs for security, abuse prevention, and incident response." : "用於安全、防濫用和事故處理的營運日誌。"}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "How We Use Data" : "資料用途"}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{isEn ? "Deliver platform features and mission workflows." : "提供平台功能及任務流程。"}</li>
              <li>{isEn ? "Detect abuse, protect accounts, and maintain system reliability." : "偵測濫用、保護帳戶及維持系統穩定。"}</li>
              <li>{isEn ? "Support customer service and incident investigation." : "支援客服及事故調查。"}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">{isEn ? "Retention and Access" : "保留與存取"}</h2>
            <p className="mt-2">
              {isEn
                ? "Operational logs and idempotency records are retained for security and reliability windows, then cleaned by scheduled jobs. You may request account data review or deletion via support."
                : "營運日誌及冪等記錄將於安全與可靠性所需期間內保留，並由排程工作於期後清理。你可透過客服提出查閱或刪除帳戶資料之申請。"}
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
