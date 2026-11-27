"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Civora backgrounds. Original components (the shadcn.io and Aceternity versions are not under an open licence we
 * can commit to a public repo); the grid and dot patterns come from Magic UI (MIT) in components/primitives.
 *
 * Rules for all of them:
 * - They sit behind content (absolute, -z-10) and never take pointer events.
 * - They animate transform only (no blur filters, no layout), on the compositor, and slowly.
 * - Reduced motion: the CSS animations stop (see "Backgrounds" in globals.css); the picture stays.
 *
 * Which background where (one system, not all of them everywhere):
 * - Aurora: the home hero only (the signature).
 * - GridPattern: How it works, the map section, workspace page headers.
 * - DotPattern: light feature sections and bento cards.
 * - MeshGradient: statistics.
 * - Beams: the final call to action.
 */

/**
 * Slow, soft ribbons of navy, royal blue and a touch of teal drifting over deep navy. Each ribbon is one large
 * radial gradient on its own layer, moved and turned by CSS keyframes, blended with "screen" so they light each
 * other where they cross.
 */
export function Aurora({ className, children, intensity = 1 }: { className?: string; children?: ReactNode; intensity?: number }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-navy", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ opacity: intensity }}>
        <div className="aurora-ribbon aurora-a" />
        <div className="aurora-ribbon aurora-b" />
        <div className="aurora-ribbon aurora-c" />
        {/* A dark floor so text near the bottom stays readable. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,var(--color-navy)_35%,transparent_70%)]" />
      </div>
      {children}
    </div>
  );
}

/**
 * A slowly shifting mesh of navy, blue and teal light. Four soft blobs drift on their own paths; used under the
 * statistics so the numbers sit on something richer than a flat fill without fighting for attention.
 */
export function MeshGradient({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-navy", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob mesh-1" />
        <div className="mesh-blob mesh-2" />
        <div className="mesh-blob mesh-3" />
        <div className="mesh-blob mesh-4" />
      </div>
      {children}
    </div>
  );
}

/**
 * Thin curved beams of light that rise across the section, each with a bright pulse travelling along it. One SVG,
 * a dozen paths; the pulse is a dash moving along the stroke (no layout, no filters).
 */
export function Beams({ className, children, count = 12 }: { className?: string; children?: ReactNode; count?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const paths = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const startX = -200 + t * 900;
    const endX = 600 + t * 1100;
    return `M${startX} 820 C ${startX + 260} ${560 - t * 120}, ${endX - 520} ${260 + t * 80}, ${endX} -40`;
  });
  return (
    <div className={cn("relative isolate overflow-hidden bg-navy", className)}>
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-line`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-action)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-action)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-pulse`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-action)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={`url(#${id}-line)`} strokeWidth="1" />
            <path
              d={d}
              fill="none"
              stroke={`url(#${id}-pulse)`}
              strokeWidth="1.5"
              strokeLinecap="round"
              pathLength={1}
              className="beam-pulse"
              style={{ animationDelay: `${(i * 0.73) % 6}s`, animationDuration: `${6 + (i % 4)}s` }}
            />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
