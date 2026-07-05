import { AdminReviewBoard } from "@/components/admin-review-board";
import { sampleSubmissions } from "@/lib/data";
import { getAdminReviewData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminReviewsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Review board demo",
      desc: "This page shows how admin/operations teams review creator submissions, add notes, and update proof status to trigger coin crediting.",
      demo: "Supabase admin is not fully configured, so this is still in demo review mode.",
      needAdmin: "Admin access required",
      needAdminDesc: "Please sign in with an account listed in ADMIN_EMAILS to view live submissions and perform review actions.",
    }
    : {
      title: "審核後台 Demo",
      desc: "呢頁示範 admin / operations team 點樣審核 creator 提交、加 reviewer notes，同調整 proof 狀態去觸發 Coins 入帳。",
      demo: "未完成 Supabase admin 設定，所以而家仲係 demo review mode。",
      needAdmin: "需要 admin 權限",
      needAdminDesc: "請使用 ADMIN_EMAILS 裡面指定嘅帳號登入，先可以睇到真實 submissions 同執行審核。",
    };

  const reviewData = await getAdminReviewData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin Review</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">{t.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          {t.desc}
        </p>
      </div>

      <div className="mt-10">
        {reviewData.mode === "demo" ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            {t.demo}
          </div>
        ) : null}

        {!reviewData.authorized && reviewData.mode === "live" ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-white">{t.needAdmin}</h2>
            <p className="mt-4 text-slate-300">
              {t.needAdminDesc}
            </p>
          </div>
        ) : (
          <AdminReviewBoard
            initialSubmissions={reviewData.authorized ? reviewData.submissions : sampleSubmissions}
            initialReviewers={reviewData.authorized ? reviewData.reviewers : []}
            locale={locale}
          />
        )}
      </div>
    </section>
  );
}
