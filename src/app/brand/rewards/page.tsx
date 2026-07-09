import { BrandRewardManager } from "@/components/brand-reward-manager";
import { getBrandMissionManagerData, getRewardsCatalog } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function BrandRewardsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Reward CRUD management",
      desc: "Brand users can create, edit, and delete rewards here. Updates are reflected on rewards pages immediately.",
      needAccess: "Brand/admin access required",
      needAccessDesc: "Please sign in with an account listed in BRAND_EMAILS or ADMIN_EMAILS.",
    }
    : {
      title: "獎賞管理",
      desc: "品牌方可於此新增、編輯與刪除獎賞；更新內容將即時同步至相關頁面。",
      needAccess: "需要品牌／管理員權限",
      needAccessDesc: "請使用 BRAND_EMAILS 或 ADMIN_EMAILS 指定帳號登入。",
    };

  const [managerData, rewardCatalog] = await Promise.all([
    getBrandMissionManagerData(),
    getRewardsCatalog(),
  ]);

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Brand Console</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{t.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">{t.desc}</p>
      </div>

      <div className="mt-10">
        {!managerData.authorized && managerData.mode === "live" ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-white">{t.needAccess}</h2>
            <p className="mt-4 text-slate-300">{t.needAccessDesc}</p>
          </div>
        ) : (
          <BrandRewardManager initialRewards={rewardCatalog.rewards} locale={locale} />
        )}
      </div>
    </section>
  );
}
