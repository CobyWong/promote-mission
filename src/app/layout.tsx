import type { Metadata } from "next";

import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Mascot } from "@/components/mascot";
import { hasAdminSession } from "@/lib/admin-session";
import { getCurrentLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Promote Mission",
  description: "Mission marketplace for creators to post IG Reels, earn Coins, and redeem rewards.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const [adminSession, supabase] = await Promise.all([hasAdminSession(), createSupabaseServerClient()]);
  const {
    data: { user },
  } = await supabase?.auth.getUser() ?? { data: { user: null } };
  const isAuthenticated = adminSession || Boolean(user);

  return (
    <html lang={locale} data-theme={theme}>
      <body className="antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        {isAuthenticated ? <Mascot locale={locale} /> : null}
      </body>
    </html>
  );
}
