import type { Metadata } from "next";
import { Google_Sans, Noto_Naskh_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import DemoBanner from "@/components/DemoBanner";
import LocaleSync from "@/components/LocaleSync";
import { MotionEffects } from "@/components/Motion";
import MotionProvider from "@/components/MotionProvider";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import PageShell from "@/components/PageShell";
import { dirOf, isLocale, LANG_COOKIE, setLocale } from "@/lib/i18n";
import "./globals.css";

const googleSans = Google_Sans({ variable: "--font-google-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
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
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning className={`${googleSans.variable} ${urdu.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <LocaleSync lang={lang} />
        <MotionEffects />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MotionProvider>
          <DemoBanner />
          <Nav />
          <PageShell>{children}</PageShell>
          <Footer />
        </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
