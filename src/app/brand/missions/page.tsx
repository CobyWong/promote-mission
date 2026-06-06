import { BrandMissionManager } from "@/components/brand-mission-manager";
import { getBrandMissionManagerData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function BrandMissionsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      section: "Brand Console",
      title: "Mission CRUD management",
      desc: "Brand users can create, edit, and delete missions here. Updates are reflected on home, mission center, and detail pages immediately.",
      needAccess: "Brand/admin access required",
      needAccessDesc: "Please sign in with an account listed in BRAND_EMAILS or ADMIN_EMAILS.",
    }
    : {
      section: "品牌後台",
      title: "任務管理",
      desc: "品牌方可以直接新增、編輯、刪除任務。更新後會即時反映到首頁、任務中心與任務詳情頁。",
      needAccess: "需要品牌／管理員權限",
      needAccessDesc: "請使用 BRAND_EMAILS 或 ADMIN_EMAILS 內的帳號登入。",
    };

  const managerData = await getBrandMissionManagerData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{t.section}</p>
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
          <BrandMissionManager initialMissions={managerData.missions} locale={locale} />
        )}
      </div>
    </section>
  );
}
