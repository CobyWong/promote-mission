import { BrandMissionManager } from "@/components/brand-mission-manager";
import { BrandRewardManager } from "@/components/brand-reward-manager";
import { getBrandMissionManagerData, getRewardsCatalog } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function BrandMissionsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Mission CRUD management",
      desc: "Brand users can create, edit, and delete missions here. Updates are reflected on home, mission center, and detail pages immediately.",
      rewardsTitle: "Reward CRUD management",
      rewardsDesc: "Brand users can also create, edit, and delete rewards. Updates are reflected on the rewards page immediately.",
      needAccess: "Brand/admin access required",
      needAccessDesc: "Please sign in with an account listed in BRAND_EMAILS or ADMIN_EMAILS.",
    }
    : {
      title: "Mission CRUD 管理",
      desc: "Brand side 可以直接新增、編輯、刪除 missions。更新後會即時反映到首頁、任務中心與詳情頁。",
      rewardsTitle: "Reward CRUD 管理",
      rewardsDesc: "Brand side 亦可以直接新增、編輯、刪除 rewards。更新後會即時反映到獎賞商城。",
      needAccess: "需要 brand/admin 權限",
      needAccessDesc: "請使用 BRAND_EMAILS 或 ADMIN_EMAILS 內的帳號登入。",
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
        <p className="mt-4 text-lg leading-8 text-slate-300">
          {t.desc}
        </p>
      </div>

      <div className="mt-10">
        {!managerData.authorized && managerData.mode === "live" ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-white">{t.needAccess}</h2>
            <p className="mt-4 text-slate-300">{t.needAccessDesc}</p>
          </div>
        ) : (
          <div className="space-y-12">
            <BrandMissionManager initialMissions={managerData.missions} locale={locale} />

            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold text-white">{t.rewardsTitle}</h2>
              <p className="mt-3 text-lg leading-8 text-slate-300">{t.rewardsDesc}</p>
            </div>

            <BrandRewardManager initialRewards={rewardCatalog.rewards} locale={locale} />
          </div>
        )}
      </div>
    </section>
  );
}
