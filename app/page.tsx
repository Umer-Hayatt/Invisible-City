"use client";

import { Activity, ArrowRight, Camera, CircleCheck, Copy, Flame, Layers, MapPin, ScanSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CityMap, { MapLayer } from "@/components/CityMap";
import { Card, CategoryIcon, IssueThumb, PriorityMeter, Segmented, SeverityBadge, Stat, btn, healthColor } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import type { NeighborhoodStat } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { CATEGORIES, CATEGORY_META, Issue, isActive } from "@/lib/types";
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

  useEffect(() => {
    api<{ issues: Issue[] }>("/api/issues").then((d) => setIssues(d.issues)).catch(() => {});
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
      <section className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Live civic map · Islamabad
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            See the unseen.
            <br />
            <span className="text-brand">Fix the forgotten.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
            Citizens report potholes, overflowing bins, broken lights and blocked footpaths with a single photo. AI triages
            them, merges duplicates, and gives the city a ranked, accountable repair queue.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/report" className={`${btn.primary} px-6 py-3 text-[15px]`}>
              <Camera size={18} /> Report a problem
            </Link>
            <Link href="/insights" className={`${btn.ghost} px-6 py-3 text-[15px]`}>
              Explore city insights <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">City health score</div>
            <div className="mt-4 flex items-center gap-6">
              <HealthRing value={o?.cityHealth ?? 0} />
              <div className="space-y-3 text-sm">
                <Mini label="Resolution rate" value={o ? `${o.resolutionRate}%` : "-"} />
                <Mini label="Average time to fix" value={o?.avgResolutionDays != null ? `${o.avgResolutionDays} days` : "-"} />
                <Mini label="Neglected areas" value={neglected.length ? neglected.map((n) => n.name).join(", ") : "None"} warn={neglected.length > 0} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {o && (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Open issues" value={o.open} hint={`${o.critical} critical right now`} icon={Flame} tone={o.critical ? "warn" : undefined} />
          <Stat label="Fixed" value={o.resolved} hint={o.unconfirmed ? t("home.unconfirmedHint", { n: o.unconfirmed }) : "with public proof of repair"} icon={CircleCheck} tone="good" />
          <Stat label="Citizen reports" value={o.totalReports} hint="photos + GPS from residents" icon={Camera} />
          <Stat label="Duplicates merged by AI" value={o.duplicatesMerged} hint="no more scattered complaints" icon={Copy} />
        </section>
      )}

      {/* Map + side */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <Segmented
              value={layer}
              onChange={setLayer}
              options={[
                { value: "issues", label: "Issues", icon: MapPin },
                { value: "heat", label: "Heatmap", icon: Flame },
                { value: "health", label: "Health", icon: Activity },
              ]}
            />
            {layer !== "health" && (
              <div className="flex items-center gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium outline-none focus:border-brand"
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-ink-2">
                  <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 accent-[#0e6b48]" />
                  Resolved
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
                <TriangleAlert size={18} /> Possibly neglected
              </div>
              <p className="mt-1 text-xs text-red-800/70">Few complaints resolved compared with the city average.</p>
              <ul className="mt-3 space-y-2">
                {neglected.map((n) => (
                  <li key={n.name} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm">
                    <span className="font-bold">{n.name}</span>
                    <span className="text-xs text-ink-2">
                      {n.resolved} of {n.total} fixed · <b className="text-red-700">{Math.round(n.resolutionRate * 100)}%</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold tracking-tight">Top priority right now</h2>
              <Link href="/admin" className="text-xs font-semibold text-brand hover:underline">
                Work queue →
              </Link>
            </div>
            <Card className="divide-y divide-line">
              {urgent.map((i) => (
                <Link key={i.id} href={`/issues/${i.id}`} className="flex gap-3 p-3 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-canvas">
                  <IssueThumb src={imageUrl(i.cover_image)} category={i.category} className="h-12 w-12 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{i.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {i.neighborhood} · {i.report_count}× reported · {timeAgo(i.created_at)}
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
      <section>
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-brand">How it works</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">From one photo to a fixed street</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Camera, t: "Report", d: "Snap a photo. Location is captured automatically." },
            { icon: ScanSearch, t: "AI triage", d: "Identifies the problem, estimates severity and detects duplicates." },
            { icon: Layers, t: "Prioritise", d: "Officials see hotspots, neglected areas and a ranked queue." },
            { icon: ShieldCheck, t: "Prove the fix", d: "Each repair closes with an after-photo citizens can verify." },
          ].map((s, idx) => (
            <Card key={s.t} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <s.icon size={20} />
                </div>
                <span className="text-xs font-bold text-muted/60">0{idx + 1}</span>
              </div>
              <div className="mt-4 font-bold">{s.t}</div>
              <div className="mt-1 text-sm leading-relaxed text-ink-2">{s.d}</div>
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
        <span className="text-4xl font-extrabold tabular-nums">{value}</span>
        <span className="text-[11px] text-white/50">out of 100</span>
      </div>
    </div>
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
        <Dot c="#0e6b48" l="Healthy 75+" />
        <Dot c="#c99a00" l="Fair 55-74" />
        <Dot c="#e26a1b" l="Poor 40-54" />
        <Dot c="#d1343b" l="Critical <40" />
        <span className="text-muted">Dashed border = possibly neglected</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-2">
      {(["low", "medium", "high", "critical"] as const).map((s) => (
        <Dot key={s} c={{ low: "#3b82c4", medium: "#e0a100", high: "#e26a1b", critical: "#d1343b" }[s]} l={s[0].toUpperCase() + s.slice(1)} />
      ))}
      <Dot c="#0e6b48" l="Resolved" ring />
      <span className="flex items-center gap-1 text-muted">
        <CategoryIcon category="other" size={12} /> Bigger dot = more citizens reported it
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
