import type { Metadata } from "next";

import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Mascot } from "@/components/mascot";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Promote Mission",
  description: "Mission marketplace for creators to post IG Reels, earn Coins, and redeem rewards.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();

  return (
    <html lang={locale} data-theme={theme}>
      <body className="antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <Mascot locale={locale} />
      </body>
    </html>
  );
}
