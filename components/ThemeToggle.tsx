"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { t } from "@/lib/i18n";

const subscribe = () => () => {};
/** True only in the browser, after hydration (the theme is unknown while the server renders). */
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Light / dark switch. The new theme spreads out from the button in a growing circle (View Transitions API);
 * browsers without it, and reduced motion, just switch.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next = dark ? "light" : "dark";
    const apply = () => {
      document.documentElement.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return apply();

    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 32;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      title={dark ? t("theme.toLight") : t("theme.toDark")}
      className={`press relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[6px] border border-char-line text-on-dark transition-colors hover:border-on-dark-2 hover:text-lime ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={dark ? "moon" : "sun"}
          initial={{ y: 14, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -14, rotate: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className="flex"
        >
          {dark ? <Moon size={16} /> : <Sun size={16} />}
        </m.span>
      </AnimatePresence>
    </button>
  );
}
