"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The home page draws its own full-width bands; every other page sits in the centred column. */
export default function PageShell({ children }: { children: ReactNode }) {
  const home = usePathname() === "/";
  return <main className={home ? "w-full flex-1" : "mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-8 sm:px-6"}>{children}</main>;
}
