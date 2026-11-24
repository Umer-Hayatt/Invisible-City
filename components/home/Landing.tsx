"use client";

import { ArrowRight, Camera, CircleCheck, Clock, MapPin, Wrench } from "lucide-react";
import Link from "next/link";
import CityMap from "@/components/CityMap";
import { CountUp } from "@/components/Motion";
import { btn } from "@/components/ui";
import { t } from "@/lib/i18n";
import type { Issue } from "@/lib/types";

/** The home page's own sections, top to bottom. The map and its list live in app/page.tsx with their data. */

export const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const FACTS = [
  { icon: Clock, title: "home.fact1", body: "home.fact1Body" },
  { icon: Wrench, title: "home.fact2", body: "home.fact2Body" },
  { icon: CircleCheck, title: "home.fact3", body: "home.fact3Body" },
] as const;

export function Hero() {
  return (
    <section className="on-dark relative isolate flex min-h-[calc(100svh-6.75rem)] flex-col overflow-hidden bg-char text-on-dark lg:max-h-[860px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/photos/crew-night.webp"
        alt=""
        fetchPriority="high"
        width={1920}
        height={1080}
        className="absolute inset-y-0 end-0 -z-20 h-full w-full object-cover object-[52%_50%] lg:w-[78%] lg:object-[46%_50%]"
      />
      <div aria-hidden className="hero-scrim absolute inset-0 -z-10 hidden lg:block" />
      <div aria-hidden className="photo-dim absolute inset-0 -z-10 lg:hidden" />

      <div className={`${wrap} flex flex-1 flex-col justify-center py-12`}>
        <h1 className="max-w-[13ch] text-[clamp(2.75rem,6vw,5rem)] font-bold leading-[1.02] tracking-[-0.025em]">
          <span className="block">{t("home.heroLine1")}</span>
          <span className="block">{t("home.heroLine2")}</span>
        </h1>
        <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-on-dark">{t("home.heroSub")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/report" className={`${btn.primary} min-h-12 px-7 text-base`}>
            {t("nav.reportLong")}
          </Link>
          <a href="#map" className={`${btn.onDark} min-h-12 px-7 text-base`}>
            {t("home.seeActive")}
          </a>
        </div>
      </div>

      <div className={`${wrap} pb-8`}>
        <ul className="grid divide-y divide-char-line rounded-[8px] border border-char-line bg-char/85 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {FACTS.map((f) => (
            <li key={f.title} className="flex gap-3.5 px-5 py-4 sm:py-5">
              <f.icon size={24} strokeWidth={1.75} className="mt-0.5 shrink-0 text-lime" aria-hidden />
              <div>
                <div className="text-[17px] font-semibold leading-snug">{t(f.title)}</div>
                <p className="mt-1 text-[15px] leading-snug text-on-dark-2">{t(f.body)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StepText({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="mt-5 text-center">
      <h3 className="text-xl font-semibold sm:text-2xl">
        {n}. {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-base leading-snug text-ink-2">{body}</p>
    </div>
  );
}

const frame = "relative aspect-[4/3] overflow-hidden rounded-[8px] bg-sunken";

/** Three steps: the photo a Citizen takes, the real map it lands on, and the repair that answers it. */
export function HowItWorks({ issues }: { issues: Issue[] }) {
  return (
    <section aria-labelledby="how-title" className={`${wrap} py-20 sm:py-28`}>
      <h2 id="how-title" className="text-center text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
        {t("home.howTitle")}
      </h2>
      <ol className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5">
        <li>
          <div className={`${frame} viewfinder`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/pothole.webp" alt={t("home.step1Alt")} loading="lazy" width={900} height={675} className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-on-lime">
                <Camera size={22} aria-hidden />
              </span>
            </span>
          </div>
          <StepText n={1} title={t("home.step1")} body={t("home.step1Body")} />
        </li>
        <Arrow />
        <li>
          <div className={`${frame} pointer-events-none`} aria-hidden inert data-kind="product">
            <CityMap issues={issues} still zoom={12} className="h-full" />
          </div>
          <StepText n={2} title={t("home.step2")} body={t("home.step2Body")} />
        </li>
        <Arrow />
        <li>
          <div className={frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/photos/streetlight-repair.webp"
              alt={t("home.step3Alt")}
              loading="lazy"
              width={1000}
              height={750}
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-[6px] bg-lime px-3 py-2 text-[15px] font-semibold text-on-lime">
              <CircleCheck size={18} aria-hidden /> {t("track.confirm")}
            </span>
          </div>
          <StepText n={3} title={t("home.step3")} body={t("home.step3Body")} />
        </li>
      </ol>
      <div className="mt-12 flex justify-center">
        <Link href="/report" className={`${btn.ghost} min-h-12 px-7 text-base`}>
          {t("nav.reportLong")}
        </Link>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <li aria-hidden className="hidden items-center md:flex md:pb-24">
      <ArrowRight size={32} strokeWidth={1.5} className="text-muted rtl:-scale-x-100" />
    </li>
  );
}

export interface Overview {
  totalReports: number;
  resolved: number;
  avgResolutionDays: number | null;
}

/** Three live figures on a strip that bridges the navy map band and the lime band. */
export function Figures({ overview, proofId }: { overview: Overview | null; proofId: number | null }) {
  const cells = [
    { value: overview?.resolved ?? null, label: t("home.figFixed") },
    { value: overview?.avgResolutionDays ?? null, label: t("home.figDays") },
    { value: overview?.totalReports ?? null, label: t("home.figReports") },
  ];
  return (
    <section aria-label={t("home.figLabel")} className="bg-[linear-gradient(to_bottom,var(--color-navy)_88px,var(--color-lime)_88px)] text-on-lime">
      <div className={wrap}>
        <dl className="grid overflow-hidden rounded-[8px] border-2 border-char bg-lime sm:grid-cols-3">
          {cells.map((c, i) => (
            <div
              key={c.label}
              className={`flex flex-col-reverse items-center px-6 py-8 text-center ${
                i === 0 ? "bg-char text-on-dark" : "border-t-2 border-char sm:border-s-2 sm:border-t-0"
              }`}
            >
              <dt className="mt-1 text-lg font-medium">{c.label}</dt>
              <dd className="text-5xl font-bold tracking-[-0.02em] tabular-nums sm:text-6xl">{c.value === null ? "-" : <CountUp value={c.value} />}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col items-center gap-5 py-12 text-center sm:py-14">
          <p className="max-w-[34ch] text-2xl font-semibold leading-snug">{t("home.proofLine")}</p>
          {proofId !== null && (
            <Link href={`/issues/${proofId}`} className={btn.char}>
              {t("home.seeProof")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function ClosingCall() {
  return (
    <section className="on-dark relative isolate flex min-h-[520px] items-center bg-char text-on-dark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/photos/hill-road.webp"
        alt={t("home.closeAlt")}
        loading="lazy"
        width={1800}
        height={1200}
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_72%]"
      />
      <div aria-hidden className="photo-dim absolute inset-0 -z-10" />
      <div className={`${wrap} flex flex-col items-center py-20 text-center`}>
        <h2 className="max-w-[16ch] text-4xl font-bold leading-[1.08] tracking-[-0.02em] sm:text-6xl">{t("home.ctaTitle")}</h2>
        <Link href="/report" className={`${btn.primary} mt-8 min-h-14 px-10 text-lg`}>
          <MapPin size={20} aria-hidden /> {t("nav.reportLong")}
        </Link>
      </div>
    </section>
  );
}
