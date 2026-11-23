"use client";

import type { LucideIcon } from "lucide-react";
import { startTransition, useId, ViewTransition } from "react";

/**
 * A row of mutually exclusive options. The choice is made inside a transition, so the dark highlight slides
 * from the old option to the new one (a named view transition) instead of jumping.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
}) {
  const name = "seg-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => startTransition(() => onChange(o.value))}
          className={`press relative isolate inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            value === o.value ? "text-canvas" : "text-ink-2 hover:text-ink"
          }`}
        >
          {value === o.value && (
            <ViewTransition name={name} share="nav-pill">
              <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-ink" />
            </ViewTransition>
          )}
          {o.icon && <o.icon size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
