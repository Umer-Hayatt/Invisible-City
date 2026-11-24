"use client";

import { Activity, Flame, MapPin, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CityMap, { MapLayer } from "@/components/CityMap";
import { ClosingSign, Figures, Gantry, MessageSign, ProofFix, RouteLine } from "@/components/home/Signage";
import { CategoryIcon, IssueThumb, PriorityMeter, Segmented, SeverityBadge, Skeleton, categoryLabel, severityLabel } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import type { NeighborhoodStat } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { CATEGORIES, Issue, isActive } from "@/lib/types";
import { imageUrl } from "@/lib/uploads-url";

interface Stats {
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

  return (
    <div className="space-y-16 sm:space-y-20">
      <div className="space-y-7">
        <Gantry hoods={stats?.neighborhoods ?? null} />
        <RouteLine issues={issues} loaded={loaded} />
        {issues.length > 0 && <MessageSign issues={issues} />}
      </div>

      <section aria-labelledby="map-title" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="map-title" className="text-3xl font-black tracking-[-0.02em] sm:text-4xl">
            {t("home.mapTitle")}
          </h2>
          <Segmented
            value={layer}
            onChange={setLayer}
            options={[
              { value: "issues", label: t("map.layerIssues"), icon: MapPin },
              { value: "heat", label: t("map.layerHeat"), icon: Flame },
              { value: "health", label: t("map.layerHealth"), icon: Activity },
            ]}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="self-start overflow-hidden rounded-[14px] border-[1.5px] border-line bg-surface">
            {layer !== "health" && (
              <div className="flex flex-wrap items-center gap-4 border-b-[1.5px] border-line px-4 py-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="rounded-[8px] border-[1.5px] border-line bg-surface px-3 py-1.5 text-sm font-semibold outline-none focus:border-brand"
                >
                  <option value="">{t("home.allCategories")}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-ink-2">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                  {t("home.showFinished")}
                </label>
              </div>
            )}
            <CityMap issues={visible} neighborhoods={stats?.neighborhoods} layer={layer} className="h-[540px]" />
            <div className="border-t-[1.5px] border-line px-4 py-3">
              <Legend layer={layer} />
            </div>
          </div>

          <aside className="min-w-0 space-y-8">
            {neglected.length > 0 && (
              <div className="rounded-[14px] border-[1.5px] border-accent bg-accent-50 p-5">
                <h3 className="flex items-center gap-2 text-lg font-black">
                  <TriangleAlert size={19} strokeWidth={2.5} /> {t("home.neglectedTitle")}
                </h3>
                <p className="mt-1 text-sm text-ink-2">{t("home.neglectedSub")}</p>
                <ul className="mt-4 divide-y divide-ink/15">
                  {neglected.map((n) => (
                    <li key={n.name} className="flex items-center justify-between py-2.5">
                      <span className="text-lg font-extrabold">{n.name}</span>
                      <span className="text-sm">
                        <Figures text={`${t("home.fixedOf", { fixed: n.resolved, total: n.total })} · ${Math.round(n.resolutionRate * 100)}%`} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-lg font-black">{t("home.topPriority")}</h3>
                <Link href="/admin" className="text-sm font-bold text-brand underline decoration-2 underline-offset-4">
                  {t("home.workQueue")}
                </Link>
              </div>
              <ul className="divide-y-[1.5px] divide-line border-y-[1.5px] border-line">
                {!loaded &&
                  [0, 1, 2, 3].map((n) => (
                    <li key={n} className="flex gap-3 py-3">
                      <Skeleton className="h-12 w-12 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-4/5" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </li>
                  ))}
                {urgent.map((i) => (
                  <li key={i.id}>
                    <Link href={`/issues/${i.id}`} className="group flex gap-3 py-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px]">
                        <IssueThumb src={imageUrl(i.cover_image)} category={i.category} className="h-full w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold group-hover:underline">{i.title}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          {i.neighborhood} · {t("home.timesReported", { n: i.report_count })} · {timeAgo(i.created_at)}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <SeverityBadge severity={i.severity} />
                          <PriorityMeter value={i.priority} />
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <ProofFix issues={issues} />

      <ClosingSign />
    </div>
  );
}

function Legend({ layer }: { layer: MapLayer }) {
  if (layer === "health")
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-2">
        <Dot c="#0e6b48" l={t("map.healthy")} />
        <Dot c="#c99a00" l={t("map.fair")} />
        <Dot c="#e26a1b" l={t("map.poor")} />
        <Dot c="#d1343b" l={t("map.critical")} />
        <span className="text-muted">{t("map.dashed")}</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-2">
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
