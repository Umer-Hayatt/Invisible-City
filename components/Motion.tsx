"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Mounted once in the root layout. Feeds the pointer position to any `.spotlight` element under it, so its soft
 * light follows the pointer (the light itself is CSS). One listener for the whole page, no per-card wiring.
 */
export function MotionEffects() {
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!card) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

/**
 * A number that counts up to its value when it first appears on screen (and glides when the value changes).
 * Shows the final value straight away for reduced motion.
 */
export function CountUp({ value, duration = 1100, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  // Figures here arrive after the page loads, so starting at 0 never flashes the final number first.
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const from = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const begin = from.current;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setShown(Math.round(begin + (value - begin) * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
        else from.current = value;
      };
      frame = requestAnimationFrame(tick);
    };
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en")}
      {suffix}
    </span>
  );
}
