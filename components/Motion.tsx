"use client";

import NumberFlow from "@number-flow/react";
import { m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
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
 * A number whose digits roll into place like an odometer (NumberFlow) when it first scrolls into view, and roll
 * again whenever the value changes. NumberFlow itself holds still for reduced motion.
 */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setSeen(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className="tabular-nums" dir="ltr">
      <NumberFlow value={seen ? value : 0} locales="en" suffix={suffix} willChange />
    </span>
  );
}

/** Tilts its content in 3D towards the pointer, with a spring so it settles softly. Flat for reduced motion and on touch. */
export function Tilt({ children, className = "", max = 8 }: { children: React.ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 200, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(py, [0, 1], ["0%", "100%"]);
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgb(255 255 255 / 0.12), transparent 60%)`);

  if (reduce) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      <m.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glare }} />
    </m.div>
  );
}

/** Drifts slightly towards the pointer while it hovers nearby, then springs back. Used on the hero's two main buttons. */
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 18 });
  const y = useSpring(0, { stiffness: 260, damping: 18 });
  if (reduce) return <>{children}</>;
  return (
    <m.div
      className="inline-block"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}

/** Moves its content at a different speed from the page while it scrolls past, for depth. Still for reduced motion. */
export function Parallax({ children, className = "", distance = 80 }: { children: React.ReactNode; className?: string; distance?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : distance]);
  return (
    <m.div ref={ref} className={className} style={{ y }}>
      {children}
    </m.div>
  );
}

/** A short burst of confetti in the city's colours, for a Report sent or a Fix confirmed. Nothing for reduced motion. */
export async function celebrate() {
  if (reducedMotion()) return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#2563eb", "#14b8a6", "#172b4d", "#ffffff"]; // action, teal, navy, surface (confetti draws on a canvas)
  const shot = (angle: number, x: number) =>
    confetti({ particleCount: 70, angle, spread: 62, startVelocity: 48, origin: { x, y: 0.75 }, colors, disableForReducedMotion: true, zIndex: 2000 });
  shot(60, 0);
  shot(120, 1);
}
