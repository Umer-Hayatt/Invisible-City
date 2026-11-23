"use client";

import { Activity, ArrowRight, Camera, CircleCheck, Copy, Flame, MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CityMap, { MapLayer } from "@/components/CityMap";
import HeroCity from "@/components/home/HeroCity";
import RotatingWord from "@/components/home/RotatingWord";
import StoryScroll from "@/components/home/StoryScroll";
import { CountUp, Magnetic, Parallax, Tilt } from "@/components/Motion";
import { m } from "motion/react";
import {
  Card,
  CategoryIcon,
  IssueThumb,
  PriorityMeter,
  Segmented,
  SeverityBadge,
  Skeleton,
  Stat,
  StatusBadge,
  categoryLabel,
  healthColor,
  severityLabel,
} from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import type { NeighborhoodStat } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { CATEGORIES, Issue, isActive } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface Stats {
  overview: {
    totalIssues: number;
    totalReports: number;
    duplicatesMerged: number;
    open: number;
    resolved: number;
    unconfirmed: number;
    critical: number;
    resolutionRate: number;
    avgResolutionDays: number | null;
    cityHealth: number;
  };
  neighborhoods: NeighborhoodStat[];
}

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [layer, setLayer] = useState<MapLayer>("issues");
  const [category, setCategory] = useState("");
  const [showResolved, setShowResolved] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ issues: Issue[] }>("/api/issues")
      .then((d) => setIssues(d.issues))
      .catch(() => {})
      .finally(() => setLoaded(true));
    api<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);

  const visible = useMemo(
    () => issues.filter((i) => (!category || i.category === category) && (showResolved || isActive(i.status))),
    [issues, category, showResolved],
  );
  const urgent = issues.filter((i) => isActive(i.status)).slice(0, 5);
  const neglected = stats?.neighborhoods.filter((n) => n.neglected) ?? [];
  const o = stats?.overview;

  return (
    <div className="space-y-10">
      {/* Hero: full width, dark, with the living city map behind it */}
      <section className="relative isolate -mt-8 ml-[calc(50%-50vw)] w-screen overflow-hidden bg-[#0b1612] text-white">
        <Parallax className="absolute inset-0 -z-10" distance={140}>
          <HeroCity className="absolute inset-0 h-full w-full" />
        </Parallax>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_50%,rgb(11_22_18/0.95)_25%,transparent_70%)]" />
        <div aria-hidden className="absolute -start-32 top-1/3 -z-10 h-96 w-96 rounded-full bg-brand/40 blur-[120px]" />

        <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {t("home.live")}
            </m.div>

            <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
              <WordsUp text={t("home.heroLine1")} />
              <WordsUp
                text={t("home.heroLine2")}
                delay={0.35}
                className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-accent bg-clip-text pb-2 text-transparent"
              />
            </h1>

            <m.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-6 text-xl font-semibold text-white/90 sm:text-2xl"
            >
              {t("home.rotatePrefix")}{" "}
              <RotatingWord
                words={[t("home.rotate1"), t("home.rotate2"), t("home.rotate3"), t("home.rotate4")]}
                className="rounded-lg bg-white/10 px-2 text-accent"
              />{" "}
              {t("home.rotateSuffix")}
            </m.p>
            <m.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-4 max-w-xl text-base leading-relaxed text-white/60"
            >
              {t("home.heroSub")}
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Magnetic>
                <Link
                  href="/report"
                  className="press shine inline-flex items-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-[15px] font-bold text-[#0b1612] shadow-[0_10px_40px_-8px_rgb(52_211_153/0.6)] transition hover:bg-emerald-300"
                >
                  <Camera size={18} /> {t("nav.reportLong")}
                </Link>
              </Magnetic>
              <Magnetic strength={0.18}>
                <Link
                  href="/insights"
                  className="press group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  {t("home.exploreInsights")}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </Link>
              </Magnetic>
            </m.div>
          </div>

          {/* Glass health card, with two live chips floating around it */}
          <m.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 120, damping: 16 }}
            className="relative mx-auto w-full max-w-md"
          >
            <Tilt className="rounded-[28px] border border-white/15 bg-white/[0.07] p-7 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{t("home.cityHealth")}</div>
              <div className="mt-5 flex items-center gap-6">
                <HealthRing value={o?.cityHealth ?? 0} />
                <div className="space-y-3 text-sm">
                  <Mini label={t("home.resolutionRate")} value={o ? `${o.resolutionRate}%` : "-"} />
                  <Mini label={t("home.avgFix")} value={o?.avgResolutionDays != null ? t("home.daysValue", { n: o.avgResolutionDays }) : "-"} />
                  <Mini
                    label={t("home.neglectedAreas")}
                    value={neglected.length ? neglected.map((n) => n.name).join(", ") : t("home.none")}
                    warn={neglected.length > 0}
                  />
                </div>
              </div>
            </Tilt>
            {o && (
              <>
                <div className="float absolute -start-6 -top-6 hidden items-center gap-2 rounded-2xl border border-white/15 bg-[#0b1612]/80 px-3.5 py-2.5 text-xs font-semibold shadow-xl backdrop-blur sm:flex">
                  <Flame size={15} className="text-orange-400" />
                  <span>
                    <CountUp value={o.open} /> {t("home.statOpen")}
                  </span>
                </div>
                <div
                  className="float absolute -bottom-6 -end-4 hidden items-center gap-2 rounded-2xl border border-white/15 bg-[#0b1612]/80 px-3.5 py-2.5 text-xs font-semibold shadow-xl backdrop-blur sm:flex"
                  style={{ animationDelay: "-3s" }}
                >
                  <CircleCheck size={15} className="text-emerald-400" />
                  <span>
                    <CountUp value={o.resolved} /> {t("home.statFixed")}
                  </span>
                </div>
              </>
            )}
          </m.div>
        </div>

        <m.div
          aria-hidden
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:flex"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {t("home.scrollHint")}
          <span className="h-8 w-[2px] rounded-full bg-gradient-to-b from-white/50 to-transparent" />
        </m.div>
      </section>

      {/* Live strip */}
      {issues.length > 0 && <LiveStrip issues={issues.slice(0, 12)} />}

      {/* Stats */}
      {!o ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </section>
      ) : (
        <section className="reveal grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat glow label={t("home.statOpen")} value={o.open} hint={t("home.statOpenHint", { n: o.critical })} icon={Flame} tone={o.critical ? "warn" : undefined} />
          <Stat
            glow
            label={t("home.statFixed")}
            value={o.resolved}
            hint={o.unconfirmed ? t("home.unconfirmedHint", { n: o.unconfirmed }) : t("home.statFixedHint")}
            icon={CircleCheck}
            tone="good"
          />
          <Stat glow label={t("home.statReports")} value={o.totalReports} hint={t("home.statReportsHint")} icon={Camera} />
          <Stat glow label={t("home.statMerged")} value={o.duplicatesMerged} hint={t("home.statMergedHint")} icon={Copy} />
        </section>
      )}

      {/* Map + side */}
      <section className="reveal grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <Segmented
              value={layer}
              onChange={setLayer}
              options={[
                { value: "issues", label: t("map.layerIssues"), icon: MapPin },
                { value: "heat", label: t("map.layerHeat"), icon: Flame },
                { value: "health", label: t("map.layerHealth"), icon: Activity },
              ]}
            />
            {layer !== "health" && (
              <div className="flex items-center gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium outline-none focus:border-brand"
                >
                  <option value="">{t("home.allCategories")}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-ink-2">
                  <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 accent-[#0e6b48]" />
                  {t("home.showFinished")}
                </label>
              </div>
            )}
          </div>
          <CityMap issues={visible} neighborhoods={stats?.neighborhoods} layer={layer} className="h-[540px]" />
          <div className="border-t border-line px-4 py-3">
            <Legend layer={layer} />
          </div>
        </Card>

        <aside className="space-y-6">
          {neglected.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <TriangleAlert size={18} /> {t("home.neglectedTitle")}
              </div>
              <p className="mt-1 text-xs text-red-800/70">{t("home.neglectedSub")}</p>
              <ul className="mt-3 space-y-2">
                {neglected.map((n) => (
                  <li key={n.name} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm">
                    <span className="font-bold">{n.name}</span>
                    <span className="text-xs text-ink-2">
                      {t("home.fixedOf", { fixed: n.resolved, total: n.total })} · <b className="text-red-700">{Math.round(n.resolutionRate * 100)}%</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold tracking-tight">{t("home.topPriority")}</h2>
              <Link href="/admin" className="text-xs font-semibold text-brand hover:underline">
                {t("home.workQueue")}
              </Link>
            </div>
            <Card className="stagger divide-y divide-line">
              {!loaded &&
                [0, 1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3 p-3">
                    <Skeleton className="h-12 w-12 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-4/5" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              {urgent.map((i) => (
                <Link
                  key={i.id}
                  href={`/issues/${i.id}`}
                  className="group flex gap-3 p-3 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-canvas"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                    <IssueThumb
                      src={imageUrl(i.cover_image)}
                      category={i.category}
                      className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{i.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {i.neighborhood} · {t("home.timesReported", { n: i.report_count })} · {timeAgo(i.created_at)}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <SeverityBadge severity={i.severity} />
                      <PriorityMeter value={i.priority} />
                    </div>
                  </div>
                </Link>
              ))}
            </Card>
          </div>
        </aside>
      </section>

      {/* How it works, told by scrolling */}
      <StoryScroll />

      {/* Closing call to action */}
      <CallToAction />
    </div>
  );
}

function HealthRing({ value }: { value: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const color = healthColor(value) === "#0e6b48" ? "#34d399" : healthColor(value);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums">
          <CountUp value={value} />
        </span>
        <span className="text-[11px] text-white/50">{t("home.outOf100")}</span>
      </div>
    </div>
  );
}

/** The latest Issues glide past under the hero; it pauses under the pointer and stops for reduced motion. */
function LiveStrip({ issues }: { issues: Issue[] }) {
  const loop = [...issues, ...issues]; // two copies, so the strip wraps around seamlessly
  return (
    <section aria-label={t("home.liveStrip")} className="marquee -mx-4 overflow-hidden py-1 sm:mx-0">
      <div className="marquee-track gap-3">
        {loop.map((i, n) => (
          <Link
            key={`${i.id}-${n}`}
            href={`/issues/${i.id}`}
            aria-hidden={n >= issues.length || undefined}
            tabIndex={n >= issues.length ? -1 : undefined}
            className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pe-4 ps-1.5 text-sm shadow-card transition hover:border-brand/40"
          >
            <span className="h-7 w-7 overflow-hidden rounded-full">
              <IssueThumb src={imageUrl(i.cover_image)} category={i.category} className="h-full w-full" />
            </span>
            <span className="max-w-[220px] truncate font-semibold">{i.title}</span>
            <span className="text-xs text-muted">
              {i.neighborhood} · {timeAgo(i.created_at)}
            </span>
            <StatusBadge status={i.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A line of the headline whose words rise one after another out of a mask. */
function WordsUp({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={`block ${className}`}>
      {text.split(" ").map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <m.span
            className="inline-block"
            initial={{ y: "110%", rotate: 4 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ delay: delay + i * 0.08, type: "spring", stiffness: 200, damping: 22 }}
          >
            {w}
            {" "}
          </m.span>
        </span>
      ))}
    </span>
  );
}

/** The big closing band: a slow sweep of green, and the one thing to do next. */
function CallToAction() {
  return (
    <m.section
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="cta-gradient relative isolate overflow-hidden rounded-[32px] px-6 py-16 text-center text-white sm:px-12"
    >
      <div aria-hidden className="street-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
      <div aria-hidden className="absolute -top-24 left-1/2 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-300/30 blur-3xl" />
      <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">{t("home.ctaTitle")}</h2>
      <p className="mx-auto mt-4 max-w-xl text-white/75">{t("home.ctaBody")}</p>
      <div className="mt-8 flex justify-center">
        <Magnetic>
          <Link
            href="/report"
            className="press shine inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-brand-700 shadow-[0_12px_40px_-10px_rgb(0_0_0/0.5)] transition hover:bg-emerald-50"
          >
            <Camera size={19} /> {t("nav.reportLong")}
          </Link>
        </Magnetic>
      </div>
    </m.section>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-white/50">{label}</div>
      <div className={`font-bold ${warn ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Legend({ layer }: { layer: MapLayer }) {
  if (layer === "health")
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-2">
        <Dot c="#0e6b48" l={t("map.healthy")} />
        <Dot c="#c99a00" l={t("map.fair")} />
        <Dot c="#e26a1b" l={t("map.poor")} />
        <Dot c="#d1343b" l={t("map.critical")} />
        <span className="text-muted">{t("map.dashed")}</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-2">
      {(["low", "medium", "high", "critical"] as const).map((s) => (
        <Dot key={s} c={{ low: "#3b82c4", medium: "#e0a100", high: "#e26a1b", critical: "#d1343b" }[s]} l={severityLabel(s)} />
      ))}
      <Dot c="#0e6b48" l={t("status.resolved")} ring />
      <Dot c="#8a8f98" l={t("status.closed_unconfirmed")} ring />
      <span className="flex items-center gap-1 text-muted">
        <CategoryIcon category="other" size={12} /> {t("map.biggerDot")}
      </span>
    </div>
  );
}
function Dot({ c, l, ring }: { c: string; l: string; ring?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={ring ? { border: `2px solid ${c}`, background: `${c}30` } : { background: c }} />
      {l}
    </span>
  );
}
