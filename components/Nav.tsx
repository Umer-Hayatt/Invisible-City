"use client";

import { LogOut, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LanguageSwitch from "@/components/LanguageSwitch";
import ThemeToggle from "@/components/ThemeToggle";
import { btn } from "@/components/ui";
import { sessionChanged, useMe } from "@/lib/me";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles-list";

/** Links each role sees. The pages and the API check the role again; this only hides what would be refused. */
function linksFor(role: Role | null) {
  const links = [{ href: "/", label: t("nav.map") }];
  if (role === "citizen") links.push({ href: "/track", label: t("nav.myReports") });
  // Citizens and visitors: the map, Report and My reports only. Insights and staff pages live in the workspace.
  return links;
}

const aiTitle = (mode: string) =>
  mode === "gemini" ? t("nav.aiGemini") : mode === "groq" ? t("nav.aiGroq") : t("nav.aiHeuristic");

/** The mark: a lime map pin, then the name with "IN" in lime. Always on charcoal. */
export function Logo() {
  return (
    <Link href="/" dir="ltr" className="flex shrink-0 items-center gap-2 text-on-dark" aria-label="INvisible City">
      <svg aria-hidden viewBox="0 0 24 32" className="h-7 w-auto">
        <path d="M12 0a12 12 0 0 0-12 12c0 8.5 12 20 12 20s12-11.5 12-20A12 12 0 0 0 12 0Z" fill="var(--color-lime)" />
        <path d="M6.8 12.4l3.7 3.7 6.9-7.4" fill="none" stroke="var(--color-char)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span aria-hidden className="text-xl font-semibold tracking-[-0.015em]">
        <span className="text-lime">IN</span>visible City
      </span>
    </Link>
  );
}

export const iconBtn = "flex h-10 w-10 items-center justify-center rounded-[6px] border border-char-line text-on-dark transition-colors hover:border-on-dark-2 hover:text-lime";

export default function Nav() {
  const path = usePathname();
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { me } = useMe();
  const LINKS = linksFor(me?.role ?? null);
  const canReport = !me || me.role === "citizen";
  async function signOut() {
    await api("/api/auth/signout", { method: "POST" });
    sessionChanged("/");
  }
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setAiMode(c.aiMode))
      .catch(() => {});
  }, []);

  // Exactly one link is active (the longest match).
  const activeHref =
    [...LINKS, ...(canReport ? [{ href: "/report", label: "" }] : []), ...(me ? [{ href: "/profile", label: "" }] : [])]
      .filter((l) => (l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const isActive = (href: string) => href === activeHref;
  // Authorities, Businesses and the Super Admin work in a sidebar workspace (components/WorkspaceShell.tsx).
  if (me && me.role !== "citizen") return null;

  return (
    <header style={{ viewTransitionName: "site-header" }} className="on-dark sticky top-0 z-[1000] bg-char text-on-dark">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-[6px] px-3 py-2 text-base font-medium transition-colors ${
                isActive(l.href) ? "text-lime" : "text-on-dark hover:text-lime"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <LanguageSwitch />
          {me ? (
            <div className="flex items-center gap-2 text-sm">
              <Link href="/profile" className="max-w-40 text-end leading-tight hover:text-lime">
                <div className="truncate font-semibold">{me.displayName || me.email}</div>
                <div className="text-on-dark-2">{t(`role.${me.role}`)}</div>
              </Link>
              <button onClick={signOut} aria-label={t("nav.signOut")} title={t("nav.signOut")} className={iconBtn}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link href="/signin" className="whitespace-nowrap px-2 py-2 text-base font-medium hover:text-lime">
              {t("nav.signIn")}
            </Link>
          )}
          {canReport && (
            <Link href="/report" className={btn.primary}>
              {t("nav.reportLong")}
            </Link>
          )}
        </div>

        <button className="flex h-11 w-11 items-center justify-center rounded-[6px] lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={t("nav.menu")}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-char-line px-4 py-3 lg:hidden">
          {[...(canReport ? [{ href: "/report", label: t("nav.reportLong") }] : []), ...LINKS, ...(me ? [{ href: "/profile", label: t("nav.profile") }] : [{ href: "/signin", label: t("nav.signIn") }])].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-[6px] px-3 py-3 text-base font-medium ${isActive(l.href) ? "bg-lime text-on-lime" : "text-on-dark"}`}
            >
              {l.label}
            </Link>
          ))}
          {me && (
            <button onClick={signOut} className="block w-full rounded-[6px] px-3 py-3 text-start text-base font-medium">
              {t("nav.signOut")}
            </button>
          )}
          <div className="ms-3 mt-2 flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
          {aiMode && (
            <div className="mt-2 flex items-center gap-1.5 px-3 text-sm text-on-dark-2">
              <Sparkles size={14} aria-hidden /> {aiTitle(aiMode)}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
