import type { Metadata } from "next";
import { Noto_Sans_TC, Sora } from "next/font/google";

import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { RecoveryHashRedirector } from "@/components/recovery-hash-redirector";
import { getCurrentLocale } from "@/lib/i18n";
import { getCurrentTheme } from "@/lib/theme";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-tc",
});

export const metadata: Metadata = {
  title: "Mission One",
  description: "Mission marketplace for creators to post IG Reels, earn Coins, and redeem rewards.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();

  return (
    <html lang={locale} data-theme={theme}>
      <body className={`${sora.variable} ${notoSansTc.variable} antialiased`}>
        <RecoveryHashRedirector />
        <Header />
        <main className="pb-[calc(env(safe-area-inset-bottom)+7.5rem)] md:pb-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
