"use client";

import { LogIn, LogOut, Menu, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, ViewTransition } from "react";

import LanguageSwitch from "@/components/LanguageSwitch";
import ThemeToggle from "@/components/ThemeToggle";
import { sessionChanged, useMe } from "@/lib/me";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles-list";

/** Links each role sees. The pages and the API check the role again; this only hides what would be refused. */
function linksFor(role: Role | null) {
  const links = [{ href: "/", label: t("nav.map") }];
  if (role === "citizen") links.push({ href: "/track", label: t("nav.myReports") });
  links.push({ href: "/insights", label: t("nav.insights") });
  if (role === "authority") links.push({ href: "/admin", label: t("nav.authority") }, { href: "/admin/offices", label: t("nav.offices") });
  if (role === "office") links.push({ href: "/office", label: t("nav.office") });
  if (role === "super_admin") links.push({ href: "/super-admin", label: t("nav.superAdmin") });
  return links;
}

const aiTitle = (mode: string) =>
  mode === "gemini" ? t("nav.aiGemini") : mode === "groq" ? t("nav.aiGroq") : t("nav.aiHeuristic");

/** The mark: a small green sign plate with "IN" in white reflective lettering, then the name. */
export function Logo() {
  return (
    <Link href="/" dir="ltr" className="flex items-center gap-1" aria-label="INvisible City">
      <span
        aria-hidden
        className="flex h-9 items-center rounded-[7px] bg-sign px-2 text-[15px] font-black leading-none tracking-tight text-sign-ink shadow-[inset_0_0_0_2px_var(--color-sign),inset_0_0_0_3.5px_var(--color-sign-ink)]"
      >
        IN
      </span>
      <span className="text-[18px] font-extrabold tracking-[-0.01em]">visible City</span>
    </Link>
  );
}

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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setAiMode(c.aiMode))
      .catch(() => {});
  }, []);

  // Exactly one link is active (the longest match), so the sliding pill below has one place to be.
  const activeHref =
    [...LINKS, ...(canReport ? [{ href: "/report", label: "" }] : []), ...(me ? [{ href: "/profile", label: "" }] : [])]
      .filter((l) => (l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/")))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const isActive = (href: string) => href === activeHref;

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className={`sticky top-0 z-[1000] border-b-[3px] border-ink bg-canvas transition-shadow duration-300 ${
        scrolled ? "shadow-[0_10px_30px_-18px_rgb(0_0_0/0.45)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-5 text-[15px] font-bold transition-colors ${
                isActive(l.href) ? "text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {isActive(l.href) && (
                // A painted lane marker under the active link; the same named marker slides to the next one.
                <ViewTransition name="nav-pill" share="nav-pill">
                  <span aria-hidden className="absolute inset-x-3 -bottom-[3px] h-[5px] bg-brand" />
                </ViewTransition>
              )}
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {aiMode && (
            <span
              title={aiTitle(aiMode)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"
            >
              <span className={`h-2 w-2 rounded-full ${aiMode !== "heuristic" ? "bg-brand" : "bg-accent"}`} />
              {aiMode !== "heuristic" ? t("nav.aiLive") : t("nav.aiOffline")}
            </span>
          )}
          <ThemeToggle />
          <LanguageSwitch />
          {canReport && (
            <Link href="/report" className="press inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-4 py-2 text-sm font-extrabold text-on-brand transition-colors hover:bg-brand-600">
              <Plus size={16} strokeWidth={2.5} /> {t("nav.report")}
            </Link>
          )}
          {me ? (
            <div className="flex items-center gap-2 text-xs">
              <Link href="/profile" className="text-end leading-tight hover:underline">
                <div className="font-semibold">{me.displayName || me.email}</div>
                <div className="text-muted">{t(`role.${me.role}`)}</div>
              </Link>
              <button onClick={signOut} aria-label={t("nav.signOut")} title={t("nav.signOut")} className="rounded-full border border-line p-2 hover:border-ink/30">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <Link href="/signin" className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink/30">
              <LogIn size={15} /> {t("nav.signIn")}
            </Link>
          )}
        </div>

        <button className="rounded-full p-2 md:hidden" onClick={() => setOpen(!open)} aria-label={t("nav.menu")}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-canvas px-4 py-3 md:hidden">
          {[...(canReport ? [{ href: "/report", label: t("nav.reportLong") }] : []), ...LINKS, ...(me ? [{ href: "/profile", label: t("nav.profile") }] : [{ href: "/signin", label: t("nav.signIn") }])].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive(l.href) ? "bg-ink text-canvas" : "text-ink-2"}`}
            >
              {l.label}
            </Link>
          ))}
          {me && (
            <button onClick={signOut} className="block w-full rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-ink-2">
              {t("nav.signOut")}
            </button>
          )}
          <div className="ms-3 mt-2 flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
          {aiMode && (
            <div className="mt-2 flex items-center gap-1.5 px-3 text-xs text-muted">
              <Sparkles size={12} /> {aiTitle(aiMode)}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
