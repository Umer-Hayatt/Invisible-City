"use client";

import { Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LanguageSwitch from "@/components/LanguageSwitch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/primitives/sheet";
import ThemeToggle from "@/components/ThemeToggle";
import { btn } from "@/components/ui";
import UserMenu, { signOut } from "@/components/UserMenu";
import { useMe } from "@/lib/me";
import { t } from "@/lib/i18n";
import type { Role } from "@/lib/roles-list";
import { cn } from "@/lib/utils";

/** Links each role sees. The pages and the API check the role again; this only hides what would be refused. */
function linksFor(role: Role | null) {
  const links = [{ href: "/", label: t("nav.map") }];
  if (role === "citizen") links.push({ href: "/track", label: t("nav.myReports") });
  // Citizens and visitors: the map, Report and My reports only. Insights and staff pages live in the workspace.
  return links;
}

const aiTitle = (mode: string) =>
  mode === "gemini" ? t("nav.aiGemini") : mode === "groq" ? t("nav.aiGroq") : t("nav.aiHeuristic");

/** The Civora mark: a navy tile holding a map pin with a tick, then the name. `inverted` sits on navy. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" dir="ltr" className={cn("flex shrink-0 items-center gap-2.5", inverted ? "text-on-dark" : "text-ink")} aria-label="Civora">
      <span aria-hidden className={cn("flex size-8 items-center justify-center rounded-md", inverted ? "bg-on-dark text-navy" : "bg-navy text-on-dark")}>
        <svg viewBox="0 0 24 32" className="h-[18px] w-auto">
          <path d="M12 0a12 12 0 0 0-12 12c0 8.5 12 20 12 20s12-11.5 12-20A12 12 0 0 0 12 0Z" fill="currentColor" />
          <path d="M6.8 12.4l3.7 3.7 6.9-7.4" fill="none" stroke="var(--color-teal)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em]">Civora</span>
    </Link>
  );
}

/** A square icon button for the light bars (theme, sign-out, menu). */
export const iconBtn =
  "flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action";

/** The Citizens' and visitors' top bar: the map, My reports, the language and theme, and the Report action. */
export default function Nav() {
  const path = usePathname();
  const [aiMode, setAiMode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { me } = useMe();
  const LINKS = linksFor(me?.role ?? null);
  const canReport = !me || me.role === "citizen";
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
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-(--banner) z-[1000] border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label={t("nav.menu")} className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(l.href) ? "bg-sunken text-ink" : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <LanguageSwitch />
          {me ? (
            <UserMenu profile />
          ) : (
            <Link href="/signin" className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink">
              {t("nav.signIn")}
            </Link>
          )}
          {canReport && (
            <Link href="/report" className={btn.primary}>
              {t("nav.reportLong")}
            </Link>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={cn(iconBtn, "md:hidden")} aria-label={t("nav.menu")}>
            <Menu size={18} />
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] gap-0 p-0">
            <SheetHeader className="border-b border-line p-4">
              <SheetTitle asChild>
                <div>
                  <Logo />
                </div>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {[
                ...LINKS,
                ...(me ? [{ href: "/profile", label: t("nav.profile") }] : [{ href: "/signin", label: t("nav.signIn") }]),
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-[15px] font-medium",
                    isActive(l.href) ? "bg-brand-50 text-brand" : "text-ink-2 hover:bg-sunken hover:text-ink",
                  )}
                >
                  {l.label}
                </Link>
              ))}
              {me && (
                <button onClick={signOut} className="rounded-md px-3 py-2.5 text-start text-[15px] font-medium text-ink-2 hover:bg-sunken">
                  {t("nav.signOut")}
                </button>
              )}
            </nav>
            <div className="mt-auto space-y-3 border-t border-line p-4">
              {canReport && (
                <Link href="/report" onClick={() => setOpen(false)} className={cn(btn.primary, "w-full")}>
                  {t("nav.reportLong")}
                </Link>
              )}
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitch />
              </div>
              {aiMode && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Sparkles size={13} aria-hidden /> {aiTitle(aiMode)}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
