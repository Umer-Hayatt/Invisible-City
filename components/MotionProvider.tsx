"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Site-wide motion setup, mounted once in the root layout:
 * - Motion (motion.dev) loads its animation features lazily, and follows the system's reduced-motion setting.
 * - Lenis smooths wheel scrolling. Maps, text boxes and anything marked `data-lenis-prevent` keep native
 *   scrolling, so zooming a map with the wheel still zooms the map. It is off for reduced motion.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const lenis = useRef<Lenis | null>(null);
  const path = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.11,
      prevent: (node) => Boolean(node.closest?.(".leaflet-container, textarea, select, [data-lenis-prevent]")),
    });
    lenis.current = instance;
    return () => {
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // A new page starts at the top straight away, instead of gliding there from where the last page was.
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true, force: true });
  }, [path]);

  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
      <LazyMotion features={domMax} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
