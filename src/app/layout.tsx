import type { Metadata } from "next";

import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { RecoveryHashRedirector } from "@/components/recovery-hash-redirector";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Mission One",
  description: "Mission marketplace for creators to post IG Reels, earn Coins, and redeem rewards.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();

  return (
    <html lang={locale} data-theme={theme}>
      <body className="antialiased">
        <RecoveryHashRedirector />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
