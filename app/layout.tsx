import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import DemoBanner from "@/components/DemoBanner";
import Nav from "@/components/Nav";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "INvisible City - See the unseen. Fix the forgotten.",
  description: "AI-powered civic issue reporting, triage and accountability for Islamabad.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <DemoBanner />
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:px-6">
            <span>
              <b className="text-ink">INvisible City</b> · See the unseen. Fix the forgotten.
            </span>
            <span>Map tiles © Esri · data © OpenStreetMap contributors</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
