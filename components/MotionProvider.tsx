"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isWorkspace } from "@/components/animate";

/**
 * Site-wide motion setup, mounted once in the root layout:
 * - Motion (motion.dev) loads its animation features lazily, and follows the system's reduced-motion setting.
 * - Lenis smooths wheel scrolling on the public pages only (the home page, Issue pages, sign-in and sign-up):
 *   working pages (the workspace, the report form, My reports) keep native scrolling, which is quicker to work with.
 *   Maps, text boxes and anything marked `data-lenis-prevent` keep native scrolling too. Off for reduced motion.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const lenis = useRef<Lenis | null>(null);
  const path = usePathname();

  const smooth = !isWorkspace(path) && !/^\/(report|track|profile)(\/|$)/.test(path);

  useEffect(() => {
    if (!smooth || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  }, [smooth]);

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
