"use client";

import { ArrowRight, Camera, CircleCheck, Clock, MapPin, Wrench } from "lucide-react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { FadeIn, ImageReveal, RevealText, SlideUp, StaggerContainer, StaggerItem } from "@/components/animate";
import CityMap from "@/components/CityMap";
import { CountUp } from "@/components/Motion";
import { btn } from "@/components/ui";
import type { CityFigures } from "@/lib/city";
import { t } from "@/lib/i18n";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Issue } from "@/lib/types";

/**
 * The home page's own sections, top to bottom. The map and its list live in app/page.tsx with their data.
 * This is the one place with "story" motion: the hero plays once on load, every later section reveals as it
 * scrolls into view. Everything is readable at once with reduced motion.
 */

export const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const FACTS = [
  { icon: Clock, title: "home.fact1", body: "home.fact1Body" },
  { icon: Wrench, title: "home.fact2", body: "home.fact2Body" },
  { icon: CircleCheck, title: "home.fact3", body: "home.fact3Body" },
] as const;

/** A small label above a section title: a teal dot and a few words. */
function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        dark ? "bg-on-dark/10 text-on-dark ring-on-dark/20" : "bg-surface text-ink-2 ring-line"
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-teal" />
      {children}
    </span>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // The photograph drifts a little slower than the page as the hero scrolls away.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);

  return (
    <section
      ref={ref}
      className="on-dark relative isolate flex min-h-[calc(100svh-6.75rem)] flex-col overflow-hidden bg-navy text-on-dark lg:max-h-[860px]"
    >
      <m.div aria-hidden className="absolute inset-y-0 end-0 -z-20 h-full w-full lg:w-[78%]" style={{ y: photoY }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <m.img
          src="/photos/crew-night.webp"
          alt=""
          fetchPriority="high"
          width={1920}
          height={1080}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.6, ease: EASE_OUT }}
          className="h-full w-full object-cover object-[52%_50%] lg:object-[46%_50%]"
        />
      </m.div>
      <div aria-hidden className="hero-scrim absolute inset-0 -z-10 hidden lg:block" />
      <div aria-hidden className="photo-dim absolute inset-0 -z-10 lg:hidden" />

      <div className={`${wrap} flex flex-1 flex-col justify-center py-12`}>
        <FadeIn now>
          <Eyebrow dark>{t("home.eyebrow")}</Eyebrow>
        </FadeIn>
        <h1 className="mt-5 max-w-[13ch] text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
          <RevealText as="span" now text={t("home.heroLine1")} className="block" delay={0.1} />
          <RevealText as="span" now text={t("home.heroLine2")} className="block text-on-dark/90" delay={0.3} />
        </h1>
        <SlideUp now delay={0.65}>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-on-dark-2">{t("home.heroSub")}</p>
        </SlideUp>
        <SlideUp now delay={0.8} className="mt-8 flex flex-wrap gap-3">
          <Link href="/report" className={`${btn.primary} min-h-12 px-7 text-base`}>
            {t("nav.reportLong")}
          </Link>
          <a href="#map" className={`${btn.onDark} min-h-12 px-7 text-base`}>
            {t("home.seeActive")}
          </a>
        </SlideUp>
      </div>

      <div className={`${wrap} pb-8`}>
        <StaggerContainer
          now
          delay={1}
          as="ul"
          className="grid divide-y divide-on-dark/15 overflow-hidden rounded-lg border border-on-dark/15 bg-navy/80 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {FACTS.map((f) => (
            <StaggerItem as="li" key={f.title} className="flex gap-3.5 px-5 py-4 sm:py-5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-on-dark/10 text-teal">
                <f.icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <div>
                <div className="text-[15px] font-semibold leading-snug">{t(f.title)}</div>
                <p className="mt-0.5 text-sm leading-snug text-on-dark-2">{t(f.body)}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function StepText({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mt-5">
      <span className="text-xs font-semibold text-brand tabular-nums">0{n}</span>
      <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{title}</h3>
      <p className="mt-1.5 max-w-[34ch] text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const frame = "relative aspect-[4/3] overflow-hidden rounded-lg bg-sunken ring-1 ring-line";

/** Three steps: the photo a Citizen takes, the real map it lands on, and the repair that answers it. */
export function HowItWorks({ issues }: { issues: Issue[] }) {
  return (
    <section aria-labelledby="how-title" className={`${wrap} py-20 sm:py-28`}>
      <div className="flex flex-col items-center text-center">
        <FadeIn>
          <Eyebrow>{t("home.howEyebrow")}</Eyebrow>
        </FadeIn>
        <RevealText as="h2" text={t("home.howTitle")} className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-5xl" />
      </div>
      <StaggerContainer
        as="ol"
        className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5"
      >
        <StaggerItem as="li">
          <ImageReveal className={`${frame} viewfinder`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/pothole.webp" alt={t("home.step1Alt")} loading="lazy" width={900} height={675} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-4 flex justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-action text-on-action shadow-float">
                <Camera size={22} aria-hidden />
              </span>
            </span>
          </ImageReveal>
          <StepText n={1} title={t("home.step1")} body={t("home.step1Body")} />
        </StaggerItem>
        <Arrow />
        <StaggerItem as="li">
          <ImageReveal className={`${frame} pointer-events-none`}>
            <div aria-hidden inert data-kind="product" className="h-full">
              <CityMap issues={issues} still zoom={12} className="h-full" />
            </div>
          </ImageReveal>
          <StepText n={2} title={t("home.step2")} body={t("home.step2Body")} />
        </StaggerItem>
        <Arrow />
        <StaggerItem as="li">
          <ImageReveal className={frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/photos/streetlight-repair.webp"
              alt={t("home.step3Alt")}
              loading="lazy"
              width={1000}
              height={750}
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-float">
              <CircleCheck size={17} className="text-teal-700" aria-hidden /> {t("track.confirm")}
            </span>
          </ImageReveal>
          <StepText n={3} title={t("home.step3")} body={t("home.step3Body")} />
        </StaggerItem>
      </StaggerContainer>
      <SlideUp className="mt-14 flex justify-center">
        <Link href="/report" className={`${btn.ghost} min-h-11 px-6`}>
          {t("nav.reportLong")} <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden />
        </Link>
      </SlideUp>
    </section>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="hidden items-center md:flex md:pb-28">
      <ArrowRight size={24} strokeWidth={1.5} className="text-line-strong rtl:-scale-x-100" />
    </li>
  );
}

/** Three live figures as white cards on the page ground, then one line of proof and a link to a real Fix. */
export function Figures({ figures, proofId }: { figures: CityFigures | null; proofId: number | null }) {
  const cells = [
    { value: figures?.resolved ?? null, label: t("home.figFixed") },
    { value: figures?.avgResolutionDays ?? null, label: t("home.figDays") },
    { value: figures?.totalReports ?? null, label: t("home.figReports") },
  ];
  return (
    <section aria-label={t("home.figLabel")} className="border-t border-line bg-surface py-20 sm:py-24">
      <div className={wrap}>
        <div className="flex flex-col items-center text-center">
          <FadeIn>
            <Eyebrow>{t("home.figEyebrow")}</Eyebrow>
          </FadeIn>
          <RevealText as="h2" text={t("home.proofLine")} className="mt-4 max-w-[26ch] text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl" />
        </div>
        <StaggerContainer as="dl" className="mt-12 grid gap-4 sm:grid-cols-3">
          {cells.map((c) => (
            <StaggerItem
              key={c.label}
              className="relative flex flex-col-reverse overflow-hidden rounded-lg border border-line bg-canvas px-6 py-7"
            >
              <dt className="mt-2 text-sm font-medium text-muted">{c.label}</dt>
              <dd className="text-5xl font-semibold tracking-[-0.03em] text-navy tabular-nums dark:text-ink sm:text-6xl">
                {c.value === null ? "–" : <CountUp value={c.value} />}
              </dd>
              <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-teal" />
            </StaggerItem>
          ))}
        </StaggerContainer>
        {proofId !== null && (
          <SlideUp className="mt-10 flex justify-center">
            <Link href={`/issues/${proofId}`} className={btn.navy}>
              {t("home.seeProof")} <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          </SlideUp>
        )}
      </div>
    </section>
  );
}

export function ClosingCall() {
  return (
    <section className="on-dark relative isolate flex min-h-[520px] items-center overflow-hidden bg-navy text-on-dark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <m.img
        src="/photos/hill-road.webp"
        alt={t("home.closeAlt")}
        loading="lazy"
        width={1800}
        height={1200}
        initial={{ scale: 1.08 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: DURATION.hero * 2, ease: EASE_OUT }}
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_72%]"
      />
      <div aria-hidden className="photo-dim absolute inset-0 -z-10" />
      <div className={`${wrap} flex flex-col items-center py-20 text-center`}>
        <RevealText as="h2" text={t("home.ctaTitle")} className="max-w-[16ch] text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl" />
        <SlideUp delay={0.3}>
          <Link href="/report" className={`${btn.primary} mt-8 min-h-12 px-8 text-base`}>
            <MapPin size={18} aria-hidden /> {t("nav.reportLong")}
          </Link>
        </SlideUp>
      </div>
    </section>
  );
}
