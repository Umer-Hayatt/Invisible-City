"use client";

import { Building2, Clock, Repeat } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryIcon, PageHeader, PageSkeleton, SectionTitle, categoryLabel } from "@/components/ui";
import { api } from "@/lib/client";
import { MessageKey, t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import type { EvidenceIssue, NeighborhoodStat, OfficeRecord, PredictiveInsight } from "@/lib/insights";
import { Category } from "@/lib/types";

const ADVICE: Partial<Record<Category, MessageKey>> = {
  road_damage: "insights.advice.road_damage",
  garbage: "insights.advice.garbage",
  streetlight: "insights.advice.streetlight",
  water_leak: "insights.advice.water_leak",
  drainage: "insights.advice.drainage",
};

interface Stats {
  neighborhoods: NeighborhoodStat[];
  predictive: PredictiveInsight[];
  offices: OfficeRecord[];
}

export default function InsightsPage() {
  const [s, setS] = useState<Stats | null>(null);
  const { me } = useMe();
  useEffect(() => {
    api<Stats>("/api/stats").then(setS).catch(() => {});
  }, []);
  if (!s) return <PageSkeleton />;
  // Sectors where the least has been fixed come first.
  const hoods = s.neighborhoods.filter((n) => n.total > 0).sort((a, b) => a.resolutionRate - b.resolutionRate || b.total - a.total);
  const neglected = hoods.filter((n) => n.neglected);
  // Citizens see percentages only; which sectors count as neglected is for officials.
  const official = me?.role === "authority" || me?.role === "super_admin";
  // Where the city hears the most: sectors by how many Reports were made there.
  const busiest = [...hoods].sort((a, b) => b.reports - a.reports || b.total - a.total).slice(0, 8);
  const columns = 2 + Number(official);

  return (
    <div className="space-y-16">
      <PageHeader title={t("insights.title")} sub={t("insights.sub")} />

      <section>
        <SectionTitle title={t("insights.sectorsTitle")} sub={t("insights.sectorsSub")} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[8px]">
            <CityMap neighborhoods={s.neighborhoods} layer="sectors" className="h-[520px]" />
          </div>
          <Card className="overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-base">
                <thead className="sticky top-0 bg-surface text-sm font-semibold text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-start">{t("insights.colSector")}</th>
                    <th className="px-3 py-3 text-end">{t("insights.colFixed")}</th>
                    <th className="py-3 pe-5 text-end">{t("insights.colAvgFix")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {hoods.map((n) => (
                    <tr key={n.name}>
                      <td className="px-5 py-3 font-semibold">{n.name}</td>
                      <td className="px-3 py-3 text-end text-lg font-semibold tabular-nums">{Math.round(n.resolutionRate * 100)}%</td>
                      <td className="py-3 pe-5 text-end tabular-nums text-ink-2">
                        {n.avgResolutionDays !== null ? t("insights.days", { n: n.avgResolutionDays }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      <section className={`grid grid-cols-[minmax(0,1fr)] gap-10 ${["", "", "lg:grid-cols-2", "lg:grid-cols-3"][columns]}`}>
        {official && (
          <InsightList title={t("insights.neglectTitle")} sub={t("insights.neglectSub")}>
            {neglected.length === 0 && <li className="py-3 text-muted">{t("insights.neglectNone")}</li>}
            {neglected.map((n) => (
              <li key={n.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3">
                <div>
                  <div className="text-lg font-semibold">{n.name}</div>
                  <div className="text-sm text-ink-2">
                    {n.spareWorkers !== null
                      ? t("insights.idleReason", { spare: n.spareWorkers, workers: n.workers ?? 0, stale: n.stale })
                      : t("insights.neglectReason", {
                          resolved: n.resolved,
                          total: n.total,
                          rate: Math.round(n.resolutionRate * 100),
                          city: Math.round(n.cityRate * 100),
                        })}
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-danger-ink">{Math.round(n.resolutionRate * 100)}%</span>
                {n.waiting.length > 0 && <Evidence label={t("insights.evidenceWaiting")} issues={n.waiting} />}
              </li>
            ))}
          </InsightList>
        )}

        <InsightList title={t("insights.predictTitle")} sub={t("insights.predictSub")}>
          {s.predictive.length === 0 && <li className="py-3 text-muted">{t("insights.predictNone")}</li>}
          {s.predictive.map((p) => (
            <li key={p.neighborhood + p.category} className="flex gap-3 py-3">
              <CategoryIcon category={p.category} size={20} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 text-base leading-snug text-ink-2">
                {t("insights.predictCluster", { n: p.count, category: categoryLabel(p.category), place: p.neighborhood })}
                {p.recurring > 0 && ` ${t("insights.predictRecurred", { n: p.recurring })}`} {t(ADVICE[p.category] ?? "insights.advice.other")}
                <Evidence label={t("insights.evidenceReports")} issues={p.issues} />
              </div>
            </li>
          ))}
        </InsightList>

        <InsightList title={t("insights.areasTitle")} sub={t("insights.areasSub")}>
          {busiest.map((n, i) => (
            <li key={n.name} className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-baseline gap-3">
                <span className="w-5 text-sm tabular-nums text-muted">{i + 1}</span>
                <span className="text-lg font-semibold">{n.name}</span>
              </span>
              <span className="text-end text-sm text-ink-2">
                <span className="block font-semibold tabular-nums text-ink">{t("insights.areaReports", { n: n.reports })}</span>
                {t("insights.areaDetail", { issues: n.total, open: n.open, pct: Math.round(n.resolutionRate * 100) })}
              </span>
            </li>
          ))}
        </InsightList>
      </section>

      <section>
        <SectionTitle title={t("insights.officesTitle")} sub={t("insights.officesSub")} />
        <Card className="overflow-hidden">
          {s.offices.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("insights.officesEmpty")}</p>
          ) : (
            <>
            <ul className="divide-y divide-line sm:hidden">
              {s.offices.map((o) => (
                <li key={o.officeId} className="p-4">
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-sm text-muted">
                    {o.department}, {o.sector}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <MiniStat label={t("insights.colAssigned")} value={o.assigned} />
                    <MiniStat label={t("insights.colFixes")} value={o.fixes} />
                    <MiniStat label={t("insights.colRejections")} value={o.rejections} />
                    <MiniStat label={t("insights.colUnconfirmed")} value={o.unconfirmed} />
                    <MiniStat label={t("insights.colAvgDays")} value={o.avgDaysToFix !== null ? t("insights.days", { n: o.avgDaysToFix }) : "-"} />
                  </dl>
                </li>
              ))}
            </ul>
            <div className="hidden max-h-[520px] overflow-auto sm:block">
              <table className="w-full min-w-[680px] text-base">
                <thead className="sticky top-0 bg-surface text-sm font-semibold text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-start">{t("insights.colOffice")}</th>
                    <th className="px-3 py-3 text-end">{t("insights.colAssigned")}</th>
                    <th className="px-3 py-3 text-end">{t("insights.colFixes")}</th>
                    <th className="px-3 py-3 text-end">{t("insights.colRejections")}</th>
                    <th className="px-3 py-3 text-end">{t("insights.colUnconfirmed")}</th>
                    <th className="py-3 pe-5 text-end">{t("insights.colAvgDays")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.offices.map((o) => (
                    <tr key={o.officeId}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-semibold">
                          <Building2 size={16} className="shrink-0 text-muted" /> {o.name}
                        </div>
                        <div className="text-sm text-muted">
                          {o.department}, {o.sector}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-end tabular-nums">{o.assigned}</td>
                      <td className="px-3 py-3 text-end tabular-nums">{o.fixes}</td>
                      <td className={`px-3 py-3 text-end tabular-nums ${o.rejections ? "font-semibold text-danger-ink" : ""}`}>{o.rejections}</td>
                      <td className="px-3 py-3 text-end tabular-nums">{o.unconfirmed}</td>
                      <td className="py-3 pe-5 text-end tabular-nums text-ink-2">
                        {o.avgDaysToFix !== null ? t("insights.days", { n: o.avgDaysToFix }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </Card>
      </section>

    </div>
  );
}

function InsightList({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-base text-ink-2">{sub}</p>
      <ul className="mt-4 divide-y divide-line border-y border-line">{children}</ul>
    </div>
  );
}

/** The Issues behind a finding, each linking to its page, so the claim can be checked. */
function Evidence({ label, issues }: { label: string; issues: EvidenceIssue[] }) {
  return (
    <div className="col-span-2 mt-2">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <ul className="mt-1 space-y-1">
        {issues.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            {i.recurrenceOf ? <Repeat size={13} className="shrink-0 text-danger-ink" aria-hidden /> : <Clock size={13} className="shrink-0 text-muted" aria-hidden />}
            <Link href={`/issues/${i.id}`} className="min-w-0 truncate font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
              {i.title}
            </Link>
            <span className="shrink-0 tabular-nums text-muted">
              {i.recurrenceOf ? t("insights.cameBack", { id: i.recurrenceOf }) : t("insights.waitingDays", { n: i.days })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
