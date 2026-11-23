"use client";

import { Activity, ArrowRight, Camera, CircleCheck, Copy, Flame, Layers, MapPin, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CityMap, { MapLayer } from "@/components/CityMap";
import { CountUp } from "@/components/Motion";
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
  btn,
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
      {/* Hero */}
      <section className="relative isolate grid items-center gap-8 py-4 lg:grid-cols-[1.4fr_1fr]">
        <div aria-hidden className="aurora">
          <span />
          <span />
          <span />
        </div>
        <div aria-hidden className="street-grid" />
        <div>
          <div className="rise mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-semibold text-ink-2 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            {t("home.live")}
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="rise block" style={{ "--i": 1 } as React.CSSProperties}>
              {t("home.heroLine1")}
            </span>
            <span className="rise block bg-gradient-to-r from-brand via-emerald-600 to-brand-700 bg-clip-text pb-1 text-transparent" style={{ "--i": 2 } as React.CSSProperties}>
              {t("home.heroLine2")}
            </span>
          </h1>
          <p className="rise mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg" style={{ "--i": 3 } as React.CSSProperties}>
            {t("home.heroSub")}
          </p>
          <div className="rise mt-7 flex flex-wrap gap-3" style={{ "--i": 4 } as React.CSSProperties}>
            <Link href="/report" className={`${btn.primary} px-6 py-3 text-[15px]`}>
              <Camera size={18} /> {t("nav.reportLong")}
            </Link>
            <Link href="/insights" className={`${btn.ghost} px-6 py-3 text-[15px]`}>
              {t("home.exploreInsights")} <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        <div className="rise relative overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-float" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 animate-pulse rounded-full bg-brand/40 blur-3xl [animation-duration:5s]" />
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{t("home.cityHealth")}</div>
            <div className="mt-4 flex items-center gap-6">
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
          </div>
        </div>
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
          <Stat label={t("home.statOpen")} value={o.open} hint={t("home.statOpenHint", { n: o.critical })} icon={Flame} tone={o.critical ? "warn" : undefined} />
          <Stat
            label={t("home.statFixed")}
            value={o.resolved}
            hint={o.unconfirmed ? t("home.unconfirmedHint", { n: o.unconfirmed }) : t("home.statFixedHint")}
            icon={CircleCheck}
            tone="good"
          />
          <Stat label={t("home.statReports")} value={o.totalReports} hint={t("home.statReportsHint")} icon={Camera} />
          <Stat label={t("home.statMerged")} value={o.duplicatesMerged} hint={t("home.statMergedHint")} icon={Copy} />
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

      {/* How it works */}
      <section className="reveal">
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand">{t("home.howEyebrow")}</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{t("home.howTitle")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {(
            [
              { icon: Camera, n: 1 },
              { icon: ScanSearch, n: 2 },
              { icon: Layers, n: 3 },
              { icon: ShieldCheck, n: 4 },
            ] as const
          ).map((s) => (
            <Card key={s.n} interactive className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand transition-transform duration-500 ease-out group-hover:-rotate-6 group-hover:scale-110">
                  <s.icon size={20} />
                </div>
                <span className="text-xs font-bold text-muted/60">0{s.n}</span>
              </div>
              <div className="mt-4 font-bold">{t(`home.step${s.n}`)}</div>
              <div className="mt-1 text-sm leading-relaxed text-ink-2">{t(`home.step${s.n}Body`)}</div>
            </Card>
          ))}
        </div>
      </section>
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
          <CountUp value={value} duration={900} />
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
