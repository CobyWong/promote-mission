import type { Metadata } from "next";

import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Mascot } from "@/components/mascot";
import { getCurrentViewer } from "@/lib/backend";
import { hasAdminSession } from "@/lib/admin-session";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Promote Mission",
  description: "Mission marketplace for creators to post IG Reels, earn Coins, and redeem rewards.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const [adminSession, viewer] = await Promise.all([hasAdminSession(), getCurrentViewer()]);
  const user = viewer.user;
  const isAuthenticated = adminSession || Boolean(user);

  return (
    <html lang={locale} data-theme={theme}>
      <body className="antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        {isAuthenticated ? <Mascot locale={locale} userId={user?.id ?? null} theme={theme} /> : null}
      </body>
    </html>
  );
}
