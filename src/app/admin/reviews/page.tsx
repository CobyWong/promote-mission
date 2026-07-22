import { AdminReviewBoard } from "@/components/admin-review-board";
import { AdminKpiPanel } from "@/components/admin-kpi-panel";
import { AdminReferralHoldBoard } from "@/components/admin-referral-hold-board";
import { getAdminReviewData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminReviewsPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Review board",
      desc: "This page shows how admin/operations teams review creator submissions, add notes, and update proof status to trigger coin crediting.",
      unavailable: "Supabase admin is not fully configured, so live review data is unavailable.",
      needAdmin: "Admin access required",
      needAdminDesc: "Please sign in with an account listed in ADMIN_EMAILS to view live submissions and perform review actions.",
    }
    : {
      title: "審核管理台",
      desc: "此頁提供管理與營運團隊審核創作者提交內容之流程，包括新增審核備註與更新 Proof 狀態，以觸發 Coins 入帳。",
      unavailable: "未完成 Supabase admin 設定，暫時未能載入真實審核資料。",
      needAdmin: "需要管理員權限",
      needAdminDesc: "請使用 ADMIN_EMAILS 指定帳號登入，方可檢視真實提交資料並執行審核。",
    };

  const reviewData = await getAdminReviewData();

  return (
    <section className="admin-mobile-ui section-shell py-10 sm:py-16">
      <div className="max-w-3xl">
        <p className="tactical-section-kicker">Admin Review</p>
        <h1 className="tactical-section-title">{t.title}</h1>
        <p className="tactical-section-lead">{t.desc}</p>
      </div>

      <div className="mt-10">
        {reviewData.authorized ? <AdminKpiPanel locale={locale} /> : null}

        {reviewData.mode === "unavailable" ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            {t.unavailable}
          </div>
        ) : null}

        {reviewData.mode === "unavailable" ? null : !reviewData.authorized ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{t.needAdmin}</h2>
            <p className="mt-4 text-slate-600">
              {t.needAdminDesc}
            </p>
          </div>
        ) : (
          <>
            <AdminReviewBoard
              initialSubmissions={reviewData.submissions}
              initialReviewers={reviewData.reviewers}
              locale={locale}
            />
            {reviewData.authorized ? <AdminReferralHoldBoard locale={locale} /> : null}
          </>
        )}
      </div>
    </section>
  );
}
