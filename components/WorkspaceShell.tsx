"use client";

import { BarChart3, Briefcase, Building2, ClipboardList, FileSignature, Hand, Inbox, LayoutDashboard, ListChecks, SearchCheck, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LanguageSwitch from "@/components/LanguageSwitch";
import { Logo } from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import { t, type MessageKey } from "@/lib/i18n";
import UserMenu from "@/components/UserMenu";
import type { Role } from "@/lib/roles-list";
import { cn } from "@/lib/utils";

/**
 * The workspace of everyone who works for or with the city: Authorities, Businesses and the Super Admin.
 * Instead of the site's top bar, a sidebar holds the places their role works in. Citizens never see it.
 * On phones the sidebar becomes a row of tabs under a slim header.
 */
type Item = { href: string; label: MessageKey; icon: LucideIcon };
export const WORKSPACE: Partial<Record<Role, Item[]>> = {
  authority: [
    { href: "/admin", label: "authority.dashboard", icon: LayoutDashboard },
    { href: "/admin/reports", label: "authority.reports", icon: ListChecks },
    { href: "/admin/requests", label: "requests.title", icon: Hand },
    { href: "/admin/contracts", label: "contract.title", icon: FileSignature },
    { href: "/admin/offices", label: "nav.offices", icon: Building2 },
  ],
  office: [
    { href: "/office", label: "business.jobs", icon: ClipboardList },
    { href: "/office/contracts", label: "contract.title", icon: FileSignature },
    { href: "/office/available", label: "available.title", icon: SearchCheck },
    { href: "/office/business", label: "business.mine", icon: Briefcase },
  ],
  super_admin: [
    { href: "/super-admin", label: "nav.superAdmin", icon: Inbox },
    { href: "/super-admin/authorities", label: "superadmin.authorities", icon: ShieldCheck },
    { href: "/super-admin/businesses", label: "nav.offices", icon: Building2 },
    { href: "/insights", label: "nav.insights", icon: BarChart3 },
  ],
};

export default function WorkspaceShell({ role, children }: { role: Role; children: ReactNode }) {
  const path = usePathname();
  const ITEMS = WORKSPACE[role] ?? [];
  // The longest matching link is the active one, so /admin/reports does not also light up /admin.
  const active = ITEMS.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const link = (i: Item, compact = false) => {
    const on = i.href === active;
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
          compact ? "shrink-0 px-3 py-2" : "px-2.5 py-2",
          on ? "bg-brand-50 text-brand" : "text-ink-2 hover:bg-sunken hover:text-ink",
        )}
      >
        <i.icon size={17} strokeWidth={on ? 2.25 : 2} aria-hidden className={on ? "text-action" : "text-muted"} />
        {t(i.label)}
      </Link>
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-var(--banner))] flex-1 flex-col lg:flex-row">
      {/* Phones and tablets: a slim white header and a row of tabs. */}
      <header className="sticky top-(--banner) z-[1000] border-b border-line bg-surface lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <nav aria-label={t("authority.workspace")} className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {ITEMS.map((i) => link(i, true))}
        </nav>
      </header>

      {/* Laptops: the sidebar. */}
      <aside className="sticky top-(--banner) hidden h-[calc(100dvh-var(--banner))] w-64 shrink-0 flex-col border-e border-line bg-surface px-3 py-4 lg:flex">
        <div className="px-2 py-1">
          <Logo />
        </div>
        <div className="mt-7 px-2.5 text-xs font-medium text-muted">{t(`role.${role}`)}</div>
        <nav aria-label={t("authority.workspace")} className="mt-2 flex flex-col gap-0.5">
          {ITEMS.map((i) => link(i))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
          <UserMenu wide />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
