"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthorityShell from "@/components/AuthorityShell";
import { useMe } from "@/lib/me";

/**
 * The home page draws its own full-width bands; every other page sits in the centred column.
 * An Authority works inside their own workspace with a sidebar instead of the site's top bar.
 */
export default function PageShell({ children }: { children: ReactNode }) {
  const home = usePathname() === "/";
  const { me } = useMe();
  if (me?.role === "authority") return <AuthorityShell>{children}</AuthorityShell>;
  return <main className={home ? "w-full flex-1" : "mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-8 sm:px-6"}>{children}</main>;
}
