"use client";

import { BarChart3, Briefcase, Building2, ClipboardList, FileSignature, Hand, Inbox, LayoutDashboard, ListChecks, LogOut, SearchCheck, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LanguageSwitch from "@/components/LanguageSwitch";
import { Logo, iconBtn } from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/client";
import { t, type MessageKey } from "@/lib/i18n";
import { sessionChanged, useMe } from "@/lib/me";
import type { Role } from "@/lib/roles-list";

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
    { href: "/insights", label: "nav.insights", icon: BarChart3 },
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
  const { me } = useMe();
  const ITEMS = WORKSPACE[role] ?? [];
  // The longest matching link is the active one, so /admin/reports does not also light up /admin.
  const active = ITEMS.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function signOut() {
    await api("/api/auth/signout", { method: "POST" });
    sessionChanged("/");
  }

  const link = (i: (typeof ITEMS)[number], compact = false) => {
    const on = i.href === active;
    return (
      <Link
        key={i.href}
        href={i.href}
        aria-current={on ? "page" : undefined}
        className={
          compact
            ? `flex shrink-0 items-center gap-2 rounded-[6px] px-3 py-2 text-[15px] font-medium ${on ? "bg-lime text-char" : "text-on-dark-2 hover:text-on-dark"}`
            : `flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[15px] font-medium transition-colors ${
                on ? "bg-lime text-char" : "text-on-dark-2 hover:bg-char-2 hover:text-on-dark"
              }`
        }
      >
        <i.icon size={18} aria-hidden />
        {t(i.label)}
      </Link>
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-1 flex-col lg:flex-row">
      {/* Phones and tablets: slim header and a row of tabs. */}
      <header className="on-dark sticky top-0 z-[1000] bg-char text-on-dark lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={signOut} aria-label={t("nav.signOut")} title={t("nav.signOut")} className={iconBtn}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <nav aria-label={t("authority.workspace")} className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {ITEMS.map((i) => link(i, true))}
        </nav>
      </header>

      {/* Laptops: the sidebar. */}
      <aside className="on-dark sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-char px-4 py-5 text-on-dark lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label={t("authority.workspace")} className="mt-8 flex flex-col gap-1">
          {ITEMS.map((i) => link(i))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-char-line pt-4">
          {me && (
            <div className="px-2 text-sm">
              <div className="truncate font-semibold">{me.displayName || me.email}</div>
              <div className="text-on-dark-2">{t(`role.${role}`)}</div>
            </div>
          )}
          <div className="flex items-center gap-2 px-2">
            <ThemeToggle />
            <LanguageSwitch />
            <button onClick={signOut} aria-label={t("nav.signOut")} title={t("nav.signOut")} className={`${iconBtn} ms-auto`}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* overflow-x-clip keeps full-width bands (PageHeader) to the content area beside the sidebar. */}
      <main className="min-w-0 flex-1 overflow-x-clip px-4 pb-20 pt-8 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
