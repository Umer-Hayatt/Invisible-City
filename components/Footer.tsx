"use client";

import Link from "next/link";
import { useMe } from "@/lib/me";
import { Logo } from "@/components/Nav";
import { t } from "@/lib/i18n";

// The photographs on the site, with their licences (full list in public/photos/CREDITS.md).
const CREDITS = [
  { by: "Ehtesham Chaudhary", licence: "Unsplash", href: "https://unsplash.com/photos/a-view-of-a-city-at-night-from-a-hill-jjvYJreVKm4" },
  { by: "muhammad asif", licence: "Unsplash", href: "https://unsplash.com/photos/a-view-of-a-city-from-a-hill-mfJdv0nLf3o" },
  { by: "Saleh Kaleem", licence: "Unsplash", href: "https://unsplash.com/photos/a-city-street-with-mountains-in-the-background-CQ7QkfMVwY0" },
  { by: "Tahamie Farooqui", licence: "Unsplash", href: "https://unsplash.com/photos/modern-mosque-with-mountains-in-the-background-at-sunset-X9e5A0zcqvY" },
  { by: "Ahsan Elahi", licence: "Pexels", href: "https://www.pexels.com/photo/scenic-islamabad-street-lined-with-vibrant-flora-38647413/" },
  { by: "Qasim Ali", licence: "Pexels", href: "https://www.pexels.com/photo/man-cleaning-the-rubbish-on-the-road-13230182/" },
  { by: "HR Capture", licence: "Pexels", href: "https://www.pexels.com/photo/construction-worker-inspecting-pipe-installation-29931974/" },
  { by: "the Civora team", licence: "own photos", href: "https://github.com/Umer-Hayatt/Invisible-City/blob/main/public/photos/CREDITS.md" },
];

export default function Footer() {
  const { me } = useMe();
  const col = (title: string, links: { href: string; label: string }[]) => (
    <nav aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-base text-on-dark-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="whitespace-nowrap hover:text-action">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  // The staff workspaces are tools, not pages to browse: no site footer there.
  if (me && me.role !== "citizen") return null;
  return (
    <footer className="on-dark bg-navy text-on-dark">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex">
            <Logo inverted />
          </div>
          <p className="mt-4 max-w-[34ch] text-base leading-relaxed text-on-dark-2">{t("footer.about")}</p>
        </div>
        {col(t("footer.citizens"), [
          { href: "/report", label: t("nav.reportLong") },
          { href: "/", label: t("nav.map") },
          { href: "/track", label: t("nav.myReports") },
        ])}
        {col(t("footer.officials"), [
          { href: "/register-office", label: t("register.title") },
          { href: "/request-access", label: t("nav.requestAccess") },
          { href: "/signin", label: t("nav.signIn") },
        ])}
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="space-y-1.5 border-t border-navy-line py-6 text-[13px] leading-relaxed text-on-dark-2">
          <p dir="ltr">Map tiles © Esri, data © OpenStreetMap contributors</p>
          <p dir="ltr" data-credits>
            Photographs:{" "}
            {CREDITS.map((c, i) => (
              <span key={c.href}>
                {i > 0 && ", "}
                <a href={c.href} className="hover:text-action">
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
