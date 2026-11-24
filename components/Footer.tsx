"use client";

import Link from "next/link";
import { useMe } from "@/lib/me";
import { Logo } from "@/components/Nav";
import { t } from "@/lib/i18n";

const CREDITS = [
  { by: "Ka23 13", licence: "CC BY-SA 4.0", href: "https://commons.wikimedia.org/wiki/File:RailroadSwitch_20200801_014921.jpg" },
  { by: "Obaid747", licence: "CC BY-SA 3.0", href: "https://commons.wikimedia.org/wiki/File:A_sunny_evening_at_Hill_Road_Islamabad_(Sector_F6).JPG" },
  { by: "Bart Everson", licence: "CC BY 2.0", href: "https://commons.wikimedia.org/wiki/File:Hennessey_Street_Potholes_New_Orleans.jpg" },
  { by: "Warszawa Stawki 2022", licence: "CC0", href: "https://commons.wikimedia.org/wiki/File:2022_Warszawa_Stawki,_wymiana_opraw_o%C5%9Bwietleniowych,_2.jpg" },
];

export default function Footer() {
  const { me } = useMe();
  const col = (title: string, links: { href: string; label: string }[]) => (
    <nav aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-base text-on-dark-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="whitespace-nowrap hover:text-lime">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  // The Authority workspace is a tool, not a page to browse: no site footer there.
  if (me?.role === "authority") return null;
  return (
    <footer className="on-dark bg-char text-on-dark">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex">
            <Logo />
          </div>
          <p className="mt-4 max-w-[34ch] text-base leading-relaxed text-on-dark-2">{t("footer.about")}</p>
        </div>
        {col(t("footer.citizens"), [
          { href: "/report", label: t("nav.reportLong") },
          { href: "/", label: t("nav.map") },
          { href: "/track", label: t("nav.myReports") },
          { href: "/insights", label: t("nav.insights") },
        ])}
        {col(t("footer.officials"), [
          { href: "/request-access", label: t("nav.requestAccess") },
          { href: "/signin", label: t("nav.signIn") },
        ])}
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="space-y-1.5 border-t border-char-line py-6 text-[13px] leading-relaxed text-on-dark-2">
          <p dir="ltr">Map tiles © Esri, data © OpenStreetMap contributors</p>
          <p dir="ltr" data-credits>
            Photographs, Wikimedia Commons:{" "}
            {CREDITS.map((c, i) => (
              <span key={c.href}>
                {i > 0 && ", "}
                <a href={c.href} className="hover:text-lime">
                  {c.by}
                </a>{" "}
                ({c.licence})
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
