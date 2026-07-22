import { AdminRedemptionBoard } from "@/components/admin-redemption-board";
import { getAdminRedemptionsData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminRedemptionsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Reward redemption admin",
      desc: "Operations can process creator redemption requests here and update fulfillment status to Pending / Fulfilled / Rejected.",
      needAdmin: "Admin access required",
      needAdminDesc: "Please sign in with an account listed in ADMIN_EMAILS to process redemption fulfillment.",
    }
    : {
      title: "獎賞兌換管理台",
      desc: "營運團隊可於此處理創作者兌換申請，並更新履約狀態為 Pending / Fulfilled / Rejected。",
      needAdmin: "需要管理員權限",
      needAdminDesc: "請使用 ADMIN_EMAILS 指定帳號登入，方可處理兌換履約流程。",
    };

  const redemptionData = await getAdminRedemptionsData();

  return (
    <section className="admin-mobile-ui section-shell py-10 sm:py-16">
      <div className="max-w-3xl">
        <p className="tactical-section-kicker">Admin Fulfillment</p>
        <h1 className="tactical-section-title">{t.title}</h1>
        <p className="tactical-section-lead">{t.desc}</p>
      </div>

      <div className="mt-10">
        {!redemptionData.authorized && redemptionData.mode === "live" ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{t.needAdmin}</h2>
            <p className="mt-4 text-slate-600">{t.needAdminDesc}</p>
          </div>
        ) : (
          <AdminRedemptionBoard initialRedemptions={redemptionData.redemptions} locale={locale} />
        )}
      </div>
    </section>
  );
}
