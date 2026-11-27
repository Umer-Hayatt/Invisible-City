"use client";

import { ArrowRight, Camera, CircleCheck, Clock, Droplets, Lightbulb, MapPin, ScanSearch, Trash2, TriangleAlert, Wrench } from "lucide-react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { BentoCard, BlurText, FadeIn, ImageReveal, ScrollReveal, SlideUp, StaggerContainer, StaggerItem } from "@/components/animate";
import { Aurora, Beams, MeshGradient } from "@/components/backgrounds";
import CityMap from "@/components/CityMap";
import { CountUp } from "@/components/Motion";
import { DotPattern } from "@/components/primitives/dot-pattern";
import { GridPattern } from "@/components/primitives/grid-pattern";
import { btn } from "@/components/ui";
import type { CityFigures } from "@/lib/city";
import { t } from "@/lib/i18n";
import { EASE_OUT } from "@/lib/motion";
import type { Issue } from "@/lib/types";

/**
 * The home page's own sections, top to bottom. The map and its list live in app/page.tsx with their data.
 * This is the one "story" page: a cinematic hero, then sections that reveal as they scroll into view, each on its
 * own background from the background system (components/backgrounds). Everything is readable at once with
 * reduced motion. Photographs are credited in public/photos/CREDITS.md and the footer.
 */

export const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const FACTS = [
  { icon: Clock, title: "home.fact1", body: "home.fact1Body" },
  { icon: Wrench, title: "home.fact2", body: "home.fact2Body" },
  { icon: CircleCheck, title: "home.fact3", body: "home.fact3Body" },
] as const;

/** A small label above a section title: a teal dot and a few words. */
export function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
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

/**
 * Islamabad at night from the Margalla Hills, under slow aurora light. The photograph settles from a slight zoom
 * and drifts slower than the page; the headline sharpens word by word.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.2]);

  return (
    <div ref={ref}>
      <Aurora className="on-dark flex min-h-[calc(100svh-6.5rem)] flex-col text-on-dark lg:max-h-[900px]" intensity={0.5} floor={false}>
        <m.div aria-hidden className="absolute inset-0 -z-20" style={{ y: photoY }}>
          <m.div
            className="absolute inset-0"
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1.02, opacity: 1 }}
            transition={{ duration: 2, ease: EASE_OUT }}
          >
            <Image src="/photos/islamabad/islamabad-night.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[50%_60%]" />
          </m.div>
          {/* Navy from the left keeps the headline readable over the city lights. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-navy)_8%,rgb(23_43_77/0.75)_45%,rgb(23_43_77/0.2)_100%)]" />
        </m.div>

        <m.div className={`${wrap} flex flex-1 flex-col justify-center py-14`} style={{ y: contentY, opacity: fade }}>
          <FadeIn now>
            <Eyebrow dark>{t("home.eyebrow")}</Eyebrow>
          </FadeIn>
          <h1 className="mt-6 max-w-[14ch] text-[clamp(2.75rem,6.4vw,5.5rem)] font-semibold leading-[1.0] tracking-[-0.035em]">
            <BlurText as="span" now text={t("home.heroLine1")} className="block" delay={0.15} />
            <BlurText as="span" now text={t("home.heroLine2")} className="block text-[#bcd3ff]" delay={0.4} />
          </h1>
          <SlideUp now delay={0.8}>
            <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-on-dark-2">{t("home.heroSub")}</p>
          </SlideUp>
          <SlideUp now delay={0.95} className="mt-9 flex flex-wrap gap-3">
            <Link href="/report" className={`${btn.primary} min-h-12 px-7 text-base shadow-[0_8px_24px_-8px_rgb(37_99_235/0.7)]`}>
              <Camera size={17} aria-hidden /> {t("nav.reportLong")}
            </Link>
            <a href="#map" className={`${btn.onDark} min-h-12 px-7 text-base`}>
              {t("home.seeActive")}
            </a>
          </SlideUp>
        </m.div>

        <div className={`${wrap} pb-8`}>
          <StaggerContainer
            now
            delay={1.15}
            as="ul"
            className="grid divide-y divide-on-dark/10 overflow-hidden rounded-xl border border-on-dark/15 bg-navy/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            {FACTS.map((f) => (
              <StaggerItem as="li" key={f.title} className="flex gap-3.5 px-5 py-4 sm:py-5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-on-dark/10 text-teal">
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
      </Aurora>
    </div>
  );
}

function StepText({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mt-5">
      <span className="font-mono text-xs font-medium text-brand">0{n}</span>
      <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{title}</h3>
      <p className="mt-1.5 max-w-[34ch] text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

const frame = "relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken ring-1 ring-line";

/** Three steps on a faint grid: the photo a Citizen takes, the live map it lands on, and the repair that answers it. */
export function HowItWorks({ issues }: { issues: Issue[] }) {
  return (
    <section aria-labelledby="how-title" className="relative isolate overflow-hidden">
      <GridPattern
        width={48}
        height={48}
        className="-z-10 fill-line/40 stroke-line [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
      />
      <div className={`${wrap} py-24 sm:py-32`}>
        <div className="flex flex-col items-center text-center">
          <FadeIn>
            <Eyebrow>{t("home.howEyebrow")}</Eyebrow>
          </FadeIn>
          <BlurText as="h2" text={t("home.howTitle")} className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl" />
          <span id="how-title" hidden>
            {t("home.howTitle")}
          </span>
        </div>
        <StaggerContainer
          as="ol"
          className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5"
        >
          <StaggerItem as="li">
            <ImageReveal className={`${frame} viewfinder`}>
              <Image src="/photos/islamabad/team-pothole.jpg" alt={t("home.step1Alt")} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover object-[50%_60%]" />
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
              <Image src="/photos/islamabad/team-road-repair.jpg" alt={t("home.step3Alt")} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
              <span className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-float">
                <CircleCheck size={17} className="text-teal-700" aria-hidden /> {t("track.confirm")}
              </span>
            </ImageReveal>
            <StepText n={3} title={t("home.step3")} body={t("home.step3Body")} />
          </StaggerItem>
        </StaggerContainer>
      </div>
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

/** What Civora looks after, as a bento grid of real Islamabad and Pakistan photographs and one product tile. */
export function Features() {
  const tag = (Icon: typeof Lightbulb, label: string) => (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-on-dark/15 px-2.5 py-1 text-xs font-medium text-on-dark ring-1 ring-inset ring-on-dark/20">
      <Icon size={13} aria-hidden /> {label}
    </span>
  );
  return (
    <section aria-labelledby="features-title" className="relative isolate overflow-hidden border-t border-line bg-canvas">
      <DotPattern width={22} height={22} cr={1} className="-z-10 text-line-strong/70 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className={`${wrap} py-24 sm:py-32`}>
        <div className="max-w-2xl">
          <FadeIn>
            <Eyebrow>{t("home.featEyebrow")}</Eyebrow>
          </FadeIn>
          <BlurText as="h2" text={t("home.featTitle")} className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl" />
          <span id="features-title" hidden>
            {t("home.featTitle")}
          </span>
          <SlideUp delay={0.2}>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">{t("home.featSub")}</p>
          </SlideUp>
        </div>

        <StaggerContainer className="mt-14 grid auto-rows-[minmax(240px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[220px] lg:grid-cols-6">
          <BentoCard
            dark
            image="/photos/islamabad/islamabad-avenue.jpg"
            imagePosition="50% 85%"
            sizes="(min-width: 1024px) 66vw, 100vw"
            imageAlt={t("home.featRoadsAlt")}
            className="flex flex-col justify-end p-6 sm:col-span-2 lg:col-span-4 lg:row-span-2"
          >
            {tag(TriangleAlert, t("home.featRoadsTag"))}
            <h3 className="mt-3 max-w-[24ch] text-2xl font-semibold tracking-tight sm:text-3xl">{t("home.featRoads")}</h3>
            <p className="mt-2 max-w-[48ch] text-[15px] text-on-dark-2">{t("home.featRoadsBody")}</p>
          </BentoCard>
          <BentoCard dark image="/photos/islamabad/sector-street.jpg" imageAlt={t("home.featSectorsAlt")} className="flex flex-col justify-end p-5 lg:col-span-2 lg:row-span-2">
            {tag(MapPin, t("home.featSectorsTag"))}
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{t("home.featSectors")}</h3>
            <p className="mt-1.5 text-sm text-on-dark-2">{t("home.featSectorsBody")}</p>
          </BentoCard>
          <BentoCard dark image="/photos/islamabad/sanitation-worker.jpg" imageAlt={t("home.featWasteAlt")} imagePosition="50% 35%" className="flex flex-col justify-end p-5 lg:col-span-2">
            {tag(Trash2, t("home.featWasteTag"))}
            <h3 className="mt-2.5 text-lg font-semibold tracking-tight">{t("home.featWaste")}</h3>
          </BentoCard>
          <BentoCard dark image="/photos/islamabad/drainage-work.jpg" imageAlt={t("home.featDrainAlt")} imagePosition="50% 30%" className="flex flex-col justify-end p-5 lg:col-span-2">
            {tag(Droplets, t("home.featDrainTag"))}
            <h3 className="mt-2.5 text-lg font-semibold tracking-tight">{t("home.featDrain")}</h3>
          </BentoCard>
          {/* A product tile: what the AI reads from one photograph. */}
          <BentoCard className="flex flex-col justify-between p-5 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <ScanSearch size={16} aria-hidden />
              </span>
              {t("home.featAi")}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-sm">
                <span className="text-muted">{t("home.featAiCategory")}</span>
                <span className="font-medium text-ink">{t("category.road_damage")}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2 text-sm">
                <span className="text-muted">{t("home.featAiDuplicate")}</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-teal-700">
                  <span aria-hidden className="size-1.5 rounded-full bg-teal" /> {t("home.featAiMerged")}
                </span>
              </div>
            </div>
          </BentoCard>
        </StaggerContainer>
      </div>
    </section>
  );
}

/** Three live figures on a slowly shifting navy mesh; the numbers count up when the section comes into view. */
export function Figures({ figures, proofId }: { figures: CityFigures | null; proofId: number | null }) {
  const cells = [
    { value: figures?.resolved ?? null, label: t("home.figFixed") },
    { value: figures?.avgResolutionDays ?? null, label: t("home.figDays") },
    { value: figures?.totalReports ?? null, label: t("home.figReports") },
  ];
  return (
    <section aria-label={t("home.figLabel")}>
      <MeshGradient className="on-dark py-24 text-on-dark sm:py-28">
        <div className={wrap}>
          <div className="flex flex-col items-center text-center">
            <FadeIn>
              <Eyebrow dark>{t("home.figEyebrow")}</Eyebrow>
            </FadeIn>
            <BlurText as="h2" text={t("home.proofLine")} className="mt-4 max-w-[24ch] text-3xl font-semibold tracking-[-0.03em] sm:text-5xl" />
          </div>
          <StaggerContainer as="dl" className="mt-14 grid gap-4 sm:grid-cols-3">
            {cells.map((c) => (
              <StaggerItem key={c.label} className="relative flex flex-col-reverse overflow-hidden rounded-xl border border-on-dark/10 bg-navy/60 px-6 py-8">
                <dt className="mt-2 text-sm font-medium text-on-dark-2">{c.label}</dt>
                <dd className="text-5xl font-semibold tracking-[-0.04em] tabular-nums sm:text-6xl">{c.value === null ? "–" : <CountUp value={c.value} />}</dd>
                <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent" />
              </StaggerItem>
            ))}
          </StaggerContainer>
          {proofId !== null && (
            <SlideUp className="mt-12 flex justify-center">
              <Link href={`/issues/${proofId}`} className={`${btn.onDark} min-h-11 px-6`}>
                {t("home.seeProof")} <ArrowRight size={16} className="rtl:-scale-x-100" aria-hidden />
              </Link>
            </SlideUp>
          )}
        </div>
      </MeshGradient>
    </section>
  );
}

/** The last word: Islamabad from Daman-e-Koh, with beams of light rising across it. */
export function ClosingCall() {
  return (
    <Beams className="on-dark text-on-dark">
      <div className="absolute inset-0 -z-20">
        <m.div
          className="absolute inset-0"
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 2.4, ease: EASE_OUT }}
        >
          <Image src="/photos/islamabad/daman-e-koh.jpg" alt={t("home.closeAlt")} fill sizes="100vw" className="object-cover object-[50%_55%]" />
        </m.div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(23_43_77/0.55),rgb(23_43_77/0.85)_70%,var(--color-navy))]" />
      </div>
      <div className={`${wrap} flex min-h-[560px] flex-col items-center justify-center py-24 text-center`}>
        <ScrollReveal>
          <Eyebrow dark>{t("home.ctaEyebrow")}</Eyebrow>
        </ScrollReveal>
        <BlurText as="h2" text={t("home.ctaTitle")} className="mt-5 max-w-[17ch] text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl" />
        <SlideUp delay={0.3}>
          <Link href="/report" className={`${btn.primary} mt-9 min-h-12 px-8 text-base shadow-[0_8px_24px_-8px_rgb(37_99_235/0.7)]`}>
            <MapPin size={18} aria-hidden /> {t("nav.reportLong")}
          </Link>
        </SlideUp>
      </div>
    </Beams>
  );
}
