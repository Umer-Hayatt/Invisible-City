"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Segmented } from "@/components/Segmented";

/**
 * Which part of a list page is showing (`?view=` in the address), so a tab survives a reload and can be linked to.
 * With no view chosen, the first tab that holds something opens, so a page never lands on an empty tab
 * while another one has work in it. A page using this must sit inside <Suspense> (it reads the address).
 */
export function useView<T extends string>(views: readonly T[], counts: Record<T, number> | null) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const asked = params.get("view") as T | null;
  const view: T =
    asked && views.includes(asked) ? asked : (counts && views.find((v) => counts[v] > 0)) || views[0];
  const setView = (v: T) => router.replace(`${path}?view=${v}`, { scroll: false });
  return [view, setView] as const;
}

/** The tab row under a page's header: each tab with how many items it holds. */
export function ViewTabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: string; count: number }[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="mb-6">
      <Segmented value={value} onChange={onChange} options={tabs} />
    </nav>
  );
}
