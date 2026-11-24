"use client";

import { Flame, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CityMap, { MapLayer, pinColor } from "@/components/CityMap";
import { ClosingCall, Figures, Hero, HowItWorks, Overview, wrap } from "@/components/home/Landing";
import { CriticalTag, Segmented, StatusBadge, categoryLabel } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { CATEGORIES, Issue, isActive } from "@/lib/types";

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [layer, setLayer] = useState<MapLayer>("issues");
  const [category, setCategory] = useState("");
  const [showResolved, setShowResolved] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { me } = useMe();

  useEffect(() => {
    api<{ issues: Issue[] }>("/api/issues")
      .then((d) => setIssues(d.issues))
      .catch(() => {})
      .finally(() => setLoaded(true));
    api<{ overview: Overview }>("/api/stats")
      .then((d) => setOverview(d.overview))
      .catch(() => {});
  }, []);

  const inCategory = useMemo(() => issues.filter((i) => !category || i.category === category), [issues, category]);
  const visible = useMemo(() => inCategory.filter((i) => showResolved || isActive(i.status)), [inCategory, showResolved]);
  const active = inCategory.filter((i) => isActive(i.status));
  // The newest confirmed Fix, with an after-photo when there is one.
  const proof = useMemo(
    () =>
      issues
        .filter((i) => i.status === "resolved" && i.resolved_at)
        .sort((a, b) => Number(!!b.after_image) - Number(!!a.after_image) || (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""))[0],
    [issues],
  );

  return (
    <>
      <Hero />
      <HowItWorks issues={active} />

      <section id="map" aria-labelledby="map-title" className="on-dark scroll-mt-16 bg-navy pb-16 pt-20 text-on-dark sm:pb-20 sm:pt-24">
        <div className={wrap}>
          <h2 id="map-title" className="text-center text-4xl font-bold tracking-[-0.02em] sm:text-5xl">
            {t("home.mapTitle")}
          </h2>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={t("report.category")}
                className="min-h-11 rounded-[6px] border border-on-dark-2 bg-navy px-3 text-[15px] font-medium text-on-dark"
              >
                <option value="">{t("home.allCategories")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
              <label className="flex min-h-11 cursor-pointer select-none items-center gap-2 text-[15px] font-medium">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="h-4.5 w-4.5 accent-lime"
                />
                {t("home.showFinished")}
              </label>
            </div>
            <Segmented
              dark
              value={layer}
              onChange={setLayer}
              options={[
                { value: "issues", label: t("map.layerIssues"), icon: MapPin },
                { value: "heat", label: t("map.layerHeat"), icon: Flame },
              ]}
            />
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div data-kind="product" className="overflow-hidden rounded-[8px] border border-navy-line">
              <CityMap issues={visible} layer={layer} className="h-[420px] sm:h-[540px]" />
              <Legend />
            </div>

            <div className="flex min-w-0 flex-col lg:relative">
              <div className="scroll-navy max-h-[560px] overflow-y-auto pe-2 lg:absolute lg:inset-0 lg:max-h-none" tabIndex={0} role="region" aria-label={t("home.activeList")}>
                <ul className="space-y-3">
                  {!loaded && [0, 1, 2, 3, 4].map((n) => <li key={n} className="h-[88px] rounded-[8px] border border-navy-line bg-navy-2" />)}
                  {loaded && active.length === 0 && <li className="rounded-[8px] border border-navy-line p-5 text-on-dark-2">{t("home.noActive")}</li>}
                  {active.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/issues/${i.id}`}
                        className="block rounded-[8px] border border-navy-line bg-navy-2 px-4 py-3.5 transition-colors hover:border-on-dark-2"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-[17px] font-semibold leading-snug">{i.title}</span>
                          <span className="shrink-0">
                            <StatusBadge status={i.status} />
                          </span>
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[15px] text-on-dark-2">
                          {t(i.report_count === 1 ? "home.reportedOnce" : "home.reportedBy", { n: i.report_count, place: i.neighborhood, when: timeAgo(i.created_at) })}
                          <CriticalTag severity={i.severity} status={i.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {me?.role === "authority" && (
            <Link href="/admin/reports" className="mt-5 inline-block font-semibold text-lime hover:text-on-dark">
              {t("home.workQueue")}
            </Link>
          )}
        </div>
      </section>

      <Figures overview={overview} proofId={proof?.id ?? null} />
      <ClosingCall />
    </>
  );
}

function Legend() {
  const items = [
    { c: pinColor("open", false), l: t("status.open") },
    { c: pinColor("in_progress", false), l: t("map.beingFixed") },
    { c: pinColor("resolved", false), l: t("status.resolved") },
    { c: pinColor("closed_unconfirmed", false), l: t("status.closed_unconfirmed") },
    { c: pinColor("open", true), l: t("severity.critical") },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-navy-line bg-navy-2 px-4 py-3 text-sm font-medium">
      {items.map((x) => (
        <li key={x.l} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-full border-2 border-white" style={{ background: x.c }} />
          {x.l}
        </li>
      ))}
    </ul>
  );
}
