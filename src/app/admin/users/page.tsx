import { AdminUserManager } from "@/components/admin-user-manager";
import { getAdminUsersData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function AdminUsersPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "User management",
      desc: "Admins can search users, edit profile fields, and remove accounts.",
      needAdmin: "Admin access required",
      needAdminDesc: "Please sign in with an account listed in ADMIN_EMAILS to manage users.",
      unavailable: "Supabase admin mode is not configured, so live user management is unavailable.",
    }
    : {
      title: "用戶管理",
      desc: "管理員可搜尋用戶、更新個人檔案欄位，及刪除帳號。",
      needAdmin: "需要管理員權限",
      needAdminDesc: "請使用 ADMIN_EMAILS 指定帳號登入，方可管理用戶。",
      unavailable: "未完成 Supabase admin 設定，暫時未能使用真實用戶管理。",
    };

  const usersData = await getAdminUsersData();

  return (
    <section className="admin-mobile-ui section-shell py-10 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Admin Users</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">{t.desc}</p>
      </div>

      <div className="mt-10">
        {usersData.mode === "unavailable" ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
            {t.unavailable}
          </div>
        ) : null}

        {usersData.mode === "unavailable" ? null : !usersData.authorized ? (
          <div className="glass-panel max-w-3xl p-8">
            <h2 className="text-2xl font-semibold text-white">{t.needAdmin}</h2>
            <p className="mt-4 text-slate-300">{t.needAdminDesc}</p>
          </div>
        ) : (
          <AdminUserManager initialUsers={usersData.users} locale={locale} />
        )}
      </div>
    </section>
  );
}
