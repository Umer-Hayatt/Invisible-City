import type { Transition, Variants } from "motion/react";

/*
 * Civora motion tokens. Every animation in the app takes its timing and easing from here, so motion feels like one
 * product. Only transform and opacity are animated (plus clip-path for image reveals), and everything respects the
 * system's reduced-motion setting through <MotionConfig reducedMotion="user"> in components/MotionProvider.tsx.
 *
 * Two registers:
 * - "story" (public pages): longer, more expressive reveals while scrolling.
 * - "work" (dashboards): short and quick, never in the way of reading or clicking.
 */

/** A soft "out" curve: fast start, gentle landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** For things that move between two resting places (indicators, reordering). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  /** Hover, press, small state changes. */
  fast: 0.18,
  /** Dashboard entrances, tabs, dialogs. */
  base: 0.32,
  /** Public-page reveals. */
  slow: 0.6,
  /** The hero headline. */
  hero: 0.9,
} as const;

export const STAGGER = {
  work: 0.04,
  story: 0.08,
  words: 0.06,
} as const;

/** Springs for things that follow the pointer or slide between places (the sidebar indicator, cards reordering). */
export const SPRING = {
  snappy: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } satisfies Transition,
  soft: { type: "spring", stiffness: 220, damping: 28 } satisfies Transition,
};

/** How far below its place an element starts before it rises in. */
export const RISE = { work: 8, story: 24 } as const;

/** Reveal when a sixth of the element is on screen, once. */
export const VIEWPORT = { once: true, amount: 0.15 } as const;

export const fadeUp = (distance: number = RISE.story, duration: number = DURATION.slow): Variants => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration, ease: EASE_OUT } },
});

export const stagger = (gap: number = STAGGER.story, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});
