"use client";

import { Flame, MapPin } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FadeIn, RevealText, ScrollProgress, SlideUp, StaggerContainer, StaggerItem } from "@/components/animate";
import CityMap, { MapLayer, pinColor } from "@/components/CityMap";
import { ClosingCall, Features, Figures, Hero, HowItWorks, wrap } from "@/components/home/Landing";
import { GridPattern } from "@/components/primitives/grid-pattern";
import { CriticalTag, Segmented, StatusBadge, categoryLabel } from "@/components/ui";
import type { CityFigures } from "@/lib/city";
import { api, timeAgo } from "@/lib/client";
import { t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import { CATEGORIES, Issue, isActive } from "@/lib/types";

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [figures, setFigures] = useState<CityFigures | null>(null);
  const [examples, setExamples] = useState(0);
  const [layer, setLayer] = useState<MapLayer>("issues");
  const [category, setCategory] = useState("");
  const [showResolved, setShowResolved] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { me } = useMe();

  useEffect(() => {
    api<{ issues: Issue[]; figures: CityFigures; examples: number }>("/api/city")
      .then((d) => {
        setIssues(d.issues);
        setFigures(d.figures);
        setExamples(d.examples);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const inCategory = useMemo(() => issues.filter((i) => !category || i.category === category), [issues, category]);
  const visible = useMemo(() => inCategory.filter((i) => showResolved || isActive(i.status)), [inCategory, showResolved]);
  const active = inCategory.filter((i) => isActive(i.status));
  // The newest confirmed Fix, with an after-photo when there is one. An Example Issue proves nothing.
  const proof = useMemo(
    () =>
      issues
        .filter((i) => !i.example && i.status === "resolved" && i.resolved_at)
        .sort((a, b) => Number(!!b.after_image) - Number(!!a.after_image) || (b.resolved_at ?? "").localeCompare(a.resolved_at ?? ""))[0],
    [issues],
  );

  return (
    <>
      <ScrollProgress />
      <Hero />
      <HowItWorks issues={active} />
      <Features />

      <section id="map" aria-labelledby="map-title" className="relative isolate scroll-mt-16 overflow-hidden border-t border-line bg-surface pb-16 pt-24 sm:pb-24 sm:pt-28">
        <GridPattern
          width={56}
          height={56}
          className="-z-10 fill-transparent stroke-line/80 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />
        <div className={wrap}>
          <div className="flex flex-col items-center">
            <FadeIn>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-2 ring-1 ring-inset ring-line">
                <span aria-hidden className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-teal" />
                </span>
                {t("home.mapEyebrow")}
              </span>
            </FadeIn>
            <RevealText as="h2" text={t("home.mapTitle")} className="mt-4 text-center text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl" />
          </div>
          <span id="map-title" hidden>
            {t("home.mapTitle")}
          </span>
          {examples > 0 && <p className="mx-auto mt-3 max-w-[60ch] text-center text-[15px] text-muted">{t("home.examplesNote")}</p>}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={t("report.category")}
                className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm font-medium text-ink-2 shadow-card outline-none hover:border-muted focus-visible:border-action focus-visible:ring-3 focus-visible:ring-action/20"
              >
                <option value="">{t("home.allCategories")}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
              <label className="flex min-h-9 cursor-pointer select-none items-center gap-2 text-sm font-medium text-ink-2">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="h-4.5 w-4.5 accent-action"
                />
                {t("home.showFinished")}
              </label>
            </div>
            <Segmented
              value={layer}
              onChange={setLayer}
              options={[
                { value: "issues", label: t("map.layerIssues"), icon: MapPin },
                { value: "heat", label: t("map.layerHeat"), icon: Flame },
              ]}
            />
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <SlideUp data-kind="product" className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
              <CityMap issues={visible} layer={layer} className="h-[420px] sm:h-[540px]" />
              <Legend />
            </SlideUp>

            <div className="flex min-w-0 flex-col lg:relative">
              <div className="max-h-[560px] overflow-y-auto pe-2 lg:absolute lg:inset-0 lg:max-h-none" tabIndex={0} role="region" aria-label={t("home.activeList")}>
                <StaggerContainer as="ul" className="space-y-3">
                  {!loaded && [0, 1, 2, 3, 4].map((n) => <li key={n} className="skeleton h-[88px] rounded-lg" />)}
                  {loaded && active.length === 0 && <li className="rounded-lg border border-dashed border-line-strong p-5 text-sm text-muted">{t("home.noActive")}</li>}
                  {active.map((i) => (
                    <StaggerItem as="li" key={i.id}>
                      <Row issue={i}>
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-[15px] font-semibold leading-snug text-ink">
                            {i.title}
                            {i.example && <span className="ms-2 rounded-md bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-line">{t("home.example")}</span>}
                          </span>
                          <span className="shrink-0">
                            <StatusBadge status={i.status} />
                          </span>
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                          {t(i.report_count === 1 ? "home.reportedOnce" : "home.reportedBy", { n: i.report_count, place: i.neighborhood, when: timeAgo(i.created_at) })}
                          <CriticalTag severity={i.severity} status={i.status} />
                        </span>
                      </Row>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </div>
          </div>
          {me?.role === "authority" && (
            <Link href="/admin/reports" className="mt-5 inline-block text-sm font-semibold text-brand hover:text-brand-700">
              {t("home.workQueue")}
            </Link>
          )}
        </div>
      </section>

      <Figures figures={figures} proofId={proof?.id ?? null} />
      <ClosingCall />
    </>
  );
}

/** A real Issue opens its page; an Example Issue has none. */
function Row({ issue, children }: { issue: Issue; children: ReactNode }) {
  const look = "block rounded-lg border border-line bg-surface px-4 py-3.5 shadow-card";
  if (issue.example) return <div className={look}>{children}</div>;
  return (
    <Link href={`/issues/${issue.id}`} className={`${look} transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised`}>
      {children}
    </Link>
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
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line bg-surface px-4 py-3 text-xs font-medium text-ink-2">
      {items.map((x) => (
        <li key={x.l} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full ring-2 ring-surface" style={{ background: x.c }} />
          {x.l}
        </li>
      ))}
    </ul>
  );
}
