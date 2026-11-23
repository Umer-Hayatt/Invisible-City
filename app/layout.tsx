import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import DemoBanner from "@/components/DemoBanner";
import LocaleSync from "@/components/LocaleSync";
import { MotionEffects } from "@/components/Motion";
import MotionProvider from "@/components/MotionProvider";
import ScrollProgress from "@/components/ScrollProgress";
import Nav from "@/components/Nav";
import { dirOf, isLocale, LANG_COOKIE, setLocale, t } from "@/lib/i18n";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Naskh rather than Nastaliq: it keeps the compact line heights the screens were designed with.
const urdu = Noto_Naskh_Arabic({ variable: "--font-urdu", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "INvisible City - See the unseen. Fix the forgotten.",
  description: "AI-powered civic issue reporting, triage and accountability for Islamabad.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLocale(saved) ? saved : "en";
  setLocale(lang); // for the text this server layout renders itself
  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${urdu.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <LocaleSync lang={lang} />
        <MotionEffects />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MotionProvider>
          <ScrollProgress />
          <DemoBanner />
          <Nav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6">{children}</main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6">
              <span>
                <b className="text-ink">INvisible City</b> · {t("footer.tagline")}
              </span>
              <span dir="ltr">Map tiles © Esri · data © OpenStreetMap contributors</span>
            </div>
          </footer>
        </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
