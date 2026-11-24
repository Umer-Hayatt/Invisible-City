"use client";

import type { LucideIcon } from "lucide-react";
import { startTransition, useId, ViewTransition } from "react";

/**
 * A row of mutually exclusive options. The choice is made inside a transition, so the lime highlight slides
 * from the old option to the new one (a named view transition) instead of jumping.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  dark = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  /** On a navy band. */
  dark?: boolean;
}) {
  const name = "seg-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className={`inline-flex rounded-[6px] border p-0.5 ${dark ? "border-on-dark-2" : "border-muted bg-surface"}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => startTransition(() => onChange(o.value))}
          className={`press relative isolate inline-flex min-h-11 items-center gap-1.5 rounded-[4px] px-3.5 text-[15px] font-semibold transition-colors ${
            value === o.value ? "text-on-lime" : dark ? "text-on-dark-2 hover:text-on-dark" : "text-ink-2 hover:text-ink"
          }`}
        >
          {value === o.value && (
            <ViewTransition name={name} share="nav-pill">
              <span aria-hidden className="absolute inset-0 -z-10 rounded-[4px] bg-lime" />
            </ViewTransition>
          )}
          {o.icon && <o.icon size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
