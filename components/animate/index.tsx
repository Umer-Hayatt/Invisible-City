"use client";

import { m, useReducedMotion, useScroll, useSpring, useTransform, type HTMLMotionProps } from "motion/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { DURATION, EASE_OUT, RISE, SPRING, STAGGER, VIEWPORT, fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Civora's reusable animation components. Pages use these instead of writing their own animation code, so timing,
 * easing and reduced-motion behaviour are the same everywhere. All of them animate transform and opacity only,
 * reserve their final space from the start (no layout shift), and show their content at once for reduced motion.
 *
 * `register`: "story" for public pages (longer, further), "work" for dashboards (short, near).
 */

type Register = "story" | "work";

/** The staff workspace (Authority, Business, Super Admin): quick "work" motion and no smooth scrolling there. */
export const isWorkspace = (path: string) => /^\/(admin|office|super-admin|insights)(\/|$)/.test(path);
const RegisterContext = createContext<Register>("story");
/** Sets the register for everything inside (the workspace shell sets "work"). */
export const MotionRegister = ({ value, children }: { value: Register; children: ReactNode }) => (
  <RegisterContext.Provider value={value}>{children}</RegisterContext.Provider>
);
const useRegister = () => useContext(RegisterContext);

type DivProps = Omit<HTMLMotionProps<"div">, "children"> & { children?: ReactNode };

/** Fades in when it scrolls into view (or at once when `now`). */
export function FadeIn({ children, delay = 0, now = false, className, ...rest }: DivProps & { delay?: number; now?: boolean }) {
  const reg = useRegister();
  const trigger = now ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <m.div
      initial="hidden"
      {...trigger}
      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: reg === "work" ? DURATION.base : DURATION.slow, ease: EASE_OUT, delay } } }}
      className={className}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/** Rises a little and fades in when it scrolls into view (or at once when `now`). */
export function SlideUp({
  children,
  delay = 0,
  now = false,
  as = "div",
  className,
  ...rest
}: DivProps & { delay?: number; now?: boolean; as?: "div" | "section" }) {
  const reg = useRegister();
  const v = fadeUp(RISE[reg], reg === "work" ? DURATION.base : DURATION.slow);
  const trigger = now ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  const Tag = m[as] as typeof m.div;
  return (
    <Tag
      initial="hidden"
      {...trigger}
      variants={{ hidden: v.hidden, show: { ...(v.show as object), transition: { duration: reg === "work" ? DURATION.base : DURATION.slow, ease: EASE_OUT, delay } } }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A heading whose words slide up into place one after another, each from behind its own line (a mask), so the text
 * reads as revealed rather than flying in. Screen readers get the whole sentence at once.
 */
export function RevealText({
  text,
  as = "h2",
  className,
  delay = 0,
  now = false,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  now?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  if (reduce) return <Tag className={className}>{text}</Tag>;
  const words = text.split(/(\s+)/);
  const MotionTag = m[as];
  const trigger = now ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <MotionTag aria-label={text} initial="hidden" {...trigger} variants={stagger(STAGGER.words, delay)} className={className}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          " "
        ) : (
          <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <m.span
              className="inline-block"
              variants={{ hidden: { y: "105%" }, show: { y: 0, transition: { duration: DURATION.hero, ease: EASE_OUT } } }}
            >
              {w}
            </m.span>
          </span>
        ),
      )}
    </MotionTag>
  );
}

/** A group whose StaggerItem children appear one after another when the group scrolls into view. */
export function StaggerContainer({
  children,
  className,
  delay = 0,
  now = false,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  now?: boolean;
  as?: "div" | "ul" | "ol" | "dl" | "section";
}) {
  const reg = useRegister();
  const Tag = m[as];
  const trigger = now ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <Tag initial="hidden" {...trigger} variants={stagger(reg === "work" ? STAGGER.work : STAGGER.story, delay)} className={className}>
      {children}
    </Tag>
  );
}

/** One child of a StaggerContainer. */
export function StaggerItem({ children, className, as = "div", ...rest }: DivProps & { as?: "div" | "li" }) {
  const reg = useRegister();
  const Tag = m[as] as typeof m.div;
  return (
    <Tag variants={fadeUp(RISE[reg], reg === "work" ? DURATION.base : DURATION.slow)} className={className} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * A card that takes part in a StaggerContainer, glides to its new place when a list is filtered or reordered
 * (`layout`), and lifts slightly on hover. Pass `layoutId`-free keys from the list so Motion can track each card.
 */
export function AnimatedCard({ children, className, lift = true, ...rest }: DivProps & { lift?: boolean }) {
  const reg = useRegister();
  return (
    <m.div
      layout="position"
      variants={fadeUp(RISE[reg], reg === "work" ? DURATION.base : DURATION.slow)}
      whileHover={lift ? { y: -2, transition: { duration: DURATION.fast } } : undefined}
      transition={SPRING.soft}
      className={cn("rounded-lg border border-line bg-surface shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised", className)}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/** An image that unveils from the bottom up and settles from a slight zoom when it scrolls into view. */
export function ImageReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      initial={{ clipPath: "inset(18% 0% 0% 0% round 8px)", opacity: 0 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 8px)", opacity: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.hero, ease: EASE_OUT }}
      className={cn("overflow-hidden", className)}
    >
      <m.div
        className="h-full w-full"
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DURATION.hero * 1.4, ease: EASE_OUT }}
      >
        {children}
      </m.div>
    </m.div>
  );
}

/**
 * Each page arrives with a short fade and rise. Keyed by the address, so it plays on every navigation; the layout
 * (bars, sidebar) stays put. Quick in the workspace, a little longer on public pages.
 */
export function PageTransition({ children, register }: { children: ReactNode; register?: Register }) {
  const path = usePathname();
  register ??= isWorkspace(path) ? "work" : "story";
  return (
    <m.div
      key={path}
      initial={{ opacity: 0, y: register === "work" ? 6 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: register === "work" ? DURATION.base : DURATION.slow, ease: EASE_OUT }}
    >
      {children}
    </m.div>
  );
}

/** A thin blue bar along the top of the window that fills as the page scrolls. Decorative; hidden from screen readers. */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.4 });
  return (
    <m.div
      aria-hidden
      style={{ scaleX }}
      className={cn("pointer-events-none fixed inset-x-0 top-0 z-[1002] h-0.5 origin-left bg-action rtl:origin-right", className)}
    />
  );
}

/**
 * Words appear one after another from left to right, each going from blurred and slightly low to sharp and in
 * place. For major headings only. The blur is small (8px) and on short text; screen readers get the sentence.
 */
export function BlurText({
  text,
  as = "h2",
  className,
  delay = 0,
  now = false,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  now?: boolean;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  if (reduce) return <Tag className={className}>{text}</Tag>;
  const MotionTag = m[as];
  const trigger = now ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <MotionTag aria-label={text} initial="hidden" {...trigger} variants={stagger(0.07, delay)} className={className}>
      {text.split(/(\s+)/).map((w, i) =>
        /^\s+$/.test(w) ? (
          " "
        ) : (
          <m.span
            key={i}
            aria-hidden
            className="inline-block will-change-[transform,filter,opacity]"
            variants={{
              hidden: { opacity: 0, y: "0.25em", filter: "blur(8px)" },
              show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_OUT } },
            }}
          >
            {w}
          </m.span>
        ),
      )}
    </MotionTag>
  );
}

type Direction = "up" | "down" | "left" | "right";
const OFFSET: Record<Direction, { x?: number; y?: number }> = { up: { y: 32 }, down: { y: -32 }, left: { x: 40 }, right: { x: -40 } };

/** A block that enters from a direction (it moves *towards* that direction) when it scrolls into view, once. */
export function ScrollReveal({
  children,
  from = "up",
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  from?: Direction;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const Tag = m[as] as typeof m.div;
  return (
    <Tag
      initial={{ opacity: 0, ...OFFSET[from] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * An image that drifts a little slower than the page while it scrolls past (scroll-linked, on the compositor).
 * The image is drawn a bit larger than its frame so the drift never shows an edge. Still for reduced motion.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  distance = 60,
  priority = false,
  sizes = "100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  distance?: number;
  priority?: boolean;
  sizes?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-distance, distance]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <m.div className="absolute inset-x-0 -inset-y-[12%]" style={{ y }}>
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className={cn("object-cover", imgClassName)} />
      </m.div>
    </div>
  );
}

/**
 * A bento tile: enters with its group (StaggerItem variants), lifts and lights its border on hover, and zooms its
 * photograph slightly. `image` is optional; the tile can hold any content.
 */
export function BentoCard({
  children,
  className,
  image,
  imageAlt = "",
  imagePosition = "center",
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  dark?: boolean;
}) {
  return (
    <m.div
      variants={fadeUp(RISE.story, DURATION.slow)}
      whileHover={{ y: -4, transition: { duration: DURATION.fast } }}
      className={cn(
        "group relative isolate overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300",
        dark ? "border-on-dark/10 bg-navy text-on-dark hover:border-teal/50" : "border-line bg-surface hover:border-action/40",
        "hover:shadow-[0_0_0_1px_rgb(37_99_235/0.15),0_18px_40px_-12px_rgb(15_23_42/0.35)]",
        className,
      )}
    >
      {image && (
        <>
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="-z-20 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            style={{ objectPosition: imagePosition }}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/55 to-navy/5" />
        </>
      )}
      {/* The light that follows the border on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 [background:radial-gradient(400px_circle_at_50%_0%,rgb(20_184_166/0.18),transparent_60%)]"
      />
      {children}
    </m.div>
  );
}
