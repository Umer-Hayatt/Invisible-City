"use client";

import { LogIn, LogOut, Menu, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { sessionChanged, useMe } from "@/lib/me";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles-list";

/** Links each role sees. The pages and the API check the role again; this only hides what would be refused. */
function linksFor(role: Role | null) {
  const links = [{ href: "/", label: t("nav.map") }];
  if (role === "citizen") links.push({ href: "/track", label: t("nav.myReports") });
  links.push({ href: "/insights", label: t("nav.insights") });
  if (role === "authority") links.push({ href: "/admin", label: t("nav.authority") });
  if (role === "office") links.push({ href: "/office", label: t("nav.office") });
  if (role === "super_admin") links.push({ href: "/super-admin", label: t("nav.superAdmin") });
  return links;
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent" />
      </span>
      <span className="text-[17px] font-extrabold tracking-tight">
        <span className="text-brand">IN</span>visible City
      </span>
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
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setAiMode(c.aiMode))
      .catch(() => {});
  }, []);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-[1000] border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                isActive(l.href) ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {aiMode && (
            <span
              title={aiMode === "claude" ? "Photos are analysed by Claude vision" : aiMode === "groq" ? "Photos are analysed by Groq (Qwen vision)" : "No AI API key set - using the offline keyword heuristic"}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"
            >
              <span className={`h-2 w-2 rounded-full ${aiMode !== "heuristic" ? "bg-brand" : "bg-accent"}`} />
              {aiMode !== "heuristic" ? "AI live" : "AI offline"}
            </span>
          )}
          {canReport && (
            <Link href="/report" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              <Plus size={16} strokeWidth={2.5} /> {t("nav.report")}
            </Link>
          )}
          {me ? (
            <div className="flex items-center gap-2 text-xs">
              <Link href="/profile" className="text-right leading-tight hover:underline">
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

        <button className="rounded-full p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
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
              className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive(l.href) ? "bg-ink text-white" : "text-ink-2"}`}
            >
              {l.label}
            </Link>
          ))}
          {me && (
            <button onClick={signOut} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-2">
              {t("nav.signOut")}
            </button>
          )}
          {aiMode && (
            <div className="mt-2 flex items-center gap-1.5 px-3 text-xs text-muted">
              <Sparkles size={12} /> {aiMode === "claude" ? "AI live (Claude vision)" : aiMode === "groq" ? "AI live (Groq vision)" : "AI offline mode"}
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
