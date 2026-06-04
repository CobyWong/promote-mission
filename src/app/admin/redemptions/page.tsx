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
      title: "Reward Redemption 後台",
      desc: "Operations 可以喺呢度處理 creator 兌換申請，更新 fulfillment 狀態為 Pending / Fulfilled / Rejected。",
      needAdmin: "需要 admin 權限",
      needAdminDesc: "請使用 ADMIN_EMAILS 內的帳號登入先可處理 redemption fulfillment。",
    };

  const redemptionData = await getAdminRedemptionsData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin Fulfillment</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{t.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          {t.desc}
        </p>
      </div>

      <div className="mt-10">
        {!redemptionData.authorized && redemptionData.mode === "live" ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-white">{t.needAdmin}</h2>
            <p className="mt-4 text-slate-300">{t.needAdminDesc}</p>
          </div>
        ) : (
          <AdminRedemptionBoard initialRedemptions={redemptionData.redemptions} locale={locale} />
        )}
      </div>
    </section>
  );
}
