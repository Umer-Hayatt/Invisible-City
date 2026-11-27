"use client";

import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { api } from "@/lib/client";
import { t } from "@/lib/i18n";
import { sessionChanged, useMe } from "@/lib/me";
import { cn } from "@/lib/utils";

export async function signOut() {
  await api("/api/auth/signout", { method: "POST" });
  sessionChanged("/");
}

/** Two letters for the avatar: the first letters of the first two words of the name, or of the email. */
export const initials = (name: string | null | undefined) =>
  (name || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/**
 * The signed-in person: an avatar that opens a menu with their name, role, profile and sign-out.
 * `wide` shows the name and role beside the avatar (the workspace sidebar); otherwise only the avatar shows.
 */
export default function UserMenu({ wide = false, profile = false }: { wide?: boolean; profile?: boolean }) {
  const { me } = useMe();
  if (!me) return null;
  const name = me.displayName || me.email || t(`role.${me.role}`);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-md text-start outline-none transition-colors focus-visible:ring-3 focus-visible:ring-action/25",
          wide ? "w-full p-2 hover:bg-sunken" : "p-0.5 hover:opacity-90",
        )}
        aria-label={t("nav.account")}
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-navy text-xs font-semibold text-on-dark">{initials(name)}</AvatarFallback>
        </Avatar>
        {wide && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-ink">{name}</span>
              <span className="block truncate text-xs text-muted">{t(`role.${me.role}`)}</span>
            </span>
            <ChevronsUpDown size={14} className="text-muted" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={wide ? "start" : "end"} side={wide ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium text-ink">{name}</div>
          {me.email && me.email !== name && <div className="truncate text-xs text-muted">{me.email}</div>}
          <div className="mt-1 text-xs text-muted">{t(`role.${me.role}`)}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profile && (
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserRound size={15} aria-hidden /> {t("nav.profile")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut size={15} aria-hidden /> {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
