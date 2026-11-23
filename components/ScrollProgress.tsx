"use client";

import { m, useScroll, useSpring } from "motion/react";

/** A thin gradient bar across the top of the screen that fills as you scroll down the page. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, restDelta: 0.001 });
  return (
    <m.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[1100] h-[3px] origin-left bg-gradient-to-r from-emerald-400 via-brand to-accent rtl:origin-right"
      style={{ scaleX }}
    />
  );
}
