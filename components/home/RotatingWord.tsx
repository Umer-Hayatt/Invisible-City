"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";

/** Cycles through words, each rolling up out of a mask, for the hero's "One photo turns … into fixed streets". */
export default function RotatingWord({ words, every = 2200, className = "" }: { words: string[]; every?: number; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % words.length), every);
    return () => clearInterval(id);
  }, [words.length, every]);

  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className}`}>
      {/* every word sits in the same grid cell, so the box is as wide as the longest and nothing jumps */}
      {words.map((w) => (
        <span key={w} className="invisible col-start-1 row-start-1">
          {w}
        </span>
      ))}
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={words[i]}
          className="col-start-1 row-start-1"
          initial={{ y: "100%", opacity: 0, filter: "blur(6px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-100%", opacity: 0, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          {words[i]}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
