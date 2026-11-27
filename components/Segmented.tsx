"use client";

import type { LucideIcon } from "lucide-react";
import { startTransition, useId, ViewTransition } from "react";

/**
 * A row of mutually exclusive options. The choice is made inside a transition, so the white highlight slides
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
  /** `count`, when given, shows how many items the option holds. */
  options: { value: T; label: string; icon?: LucideIcon; count?: number }[];
  /** On a navy band. */
  dark?: boolean;
}) {
  const name = "seg-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className={`inline-flex max-w-full overflow-x-auto rounded-[6px] p-1 ${dark ? "border border-on-dark-2" : "bg-sunken"}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => startTransition(() => onChange(o.value))}
          className={`press relative isolate inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-sm font-medium transition-colors ${
            value === o.value ? (dark ? "text-navy" : "text-ink") : dark ? "text-on-dark-2 hover:text-on-dark" : "text-muted hover:text-ink"
          }`}
        >
          {value === o.value && (
            <ViewTransition name={name} share="nav-pill">
              <span aria-hidden className="absolute inset-0 -z-10 rounded-[5px] bg-surface shadow-raised ring-1 ring-line" />
            </ViewTransition>
          )}
          {o.icon && <o.icon size={15} />}
          {o.label}
          {o.count !== undefined && (
            <span
              className={`min-w-6 rounded-full px-1.5 text-center text-[13px] tabular-nums ${
                value === o.value ? "bg-navy/10" : dark ? "bg-on-dark/15" : "bg-sunken text-ink-2"
              }`}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
