"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryIcon, PageHeader, PageSkeleton, SectionTitle, categoryLabel } from "@/components/ui";
import { api } from "@/lib/client";
import { MessageKey, t } from "@/lib/i18n";
import { useMe } from "@/lib/me";
import type { NeighborhoodStat, OfficeRecord, PredictiveInsight, PublicContributor } from "@/lib/insights";
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
  leaderboard: PublicContributor[];
  offices: OfficeRecord[];
  overview: { unconfirmed: number; byCategory: { category: Category; open: number; resolved: number }[] };
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
  // Citizens who have not set a display name are left out.
  const named = s.leaderboard.filter((c) => c.name);
  const columns = 1 + Number(official) + Number(named.length > 0);
  const maxCat = Math.max(1, ...s.overview.byCategory.map((c) => c.open + c.resolved));

  return (
    <div className="space-y-16">
      <PageHeader title={t("insights.title")} sub={t("insights.sub")} />

      <section>
        <SectionTitle title={t("insights.sectorsTitle")} sub={t("insights.sectorsSub")} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="map-night overflow-hidden rounded-[8px]">
            <CityMap neighborhoods={s.neighborhoods} layer="sectors" night className="h-[520px]" />
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
              <li key={n.name} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <div className="text-lg font-semibold">{n.name}</div>
                  <div className="text-sm text-ink-2">
                    {t("insights.neglectReason", {
                      resolved: n.resolved,
                      total: n.total,
                      rate: Math.round(n.resolutionRate * 100),
                      city: Math.round(n.cityRate * 100),
                    })}
                  </div>
                </div>
                <span className="text-2xl font-bold tabular-nums text-danger-ink">{Math.round(n.resolutionRate * 100)}%</span>
              </li>
            ))}
          </InsightList>
        )}

        <InsightList title={t("insights.predictTitle")} sub={t("insights.predictSub")}>
          {s.predictive.length === 0 && <li className="py-3 text-muted">{t("insights.predictNone")}</li>}
          {s.predictive.map((p) => (
            <li key={p.neighborhood + p.category} className="flex gap-3 py-3">
              <CategoryIcon category={p.category} size={20} className="mt-0.5 shrink-0 text-muted" />
              <div className="text-base leading-snug text-ink-2">
                {t("insights.predictCluster", { n: p.count, category: categoryLabel(p.category), place: p.neighborhood })}
                {p.recurring > 0 && ` ${t("insights.predictRecurred", { n: p.recurring })}`} {t(ADVICE[p.category] ?? "insights.advice.other")}
              </div>
            </li>
          ))}
        </InsightList>

        {named.length > 0 && (
          <InsightList title={t("insights.leaderTitle")} sub={t("insights.leaderSub")}>
            {named.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <span className="font-semibold">{c.name}</span>
                <span className="tabular-nums text-ink-2">{t("office.reports", { n: c.reports })}</span>
              </li>
            ))}
          </InsightList>
        )}
      </section>

      <section>
        <SectionTitle title={t("insights.officesTitle")} sub={t("insights.officesSub")} />
        <Card className="overflow-hidden">
          {s.offices.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("insights.officesEmpty")}</p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
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
          )}
        </Card>
      </section>

      <section>
        <SectionTitle title={t("insights.byCategoryTitle")} sub={t("insights.byCategorySub")} />
        <Card className="space-y-4 p-6">
          {s.overview.byCategory
            .filter((c) => c.open + c.resolved > 0)
            .sort((a, b) => b.open + b.resolved - (a.open + a.resolved))
            .map((c) => (
              <div key={c.category} className="grid items-center gap-x-4 gap-y-2 text-base sm:grid-cols-[240px_minmax(0,1fr)_auto]">
                <span className="flex items-center gap-2 font-semibold">
                  <CategoryIcon category={c.category} size={16} className="text-muted" />
                  {categoryLabel(c.category)}
                </span>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-[3px] bg-sunken">
                  <div className="bg-chart-open" style={{ width: `${(c.open / maxCat) * 100}%` }} title={t("insights.openN", { n: c.open })} />
                  <div className="bg-lime-600" style={{ width: `${(c.resolved / maxCat) * 100}%` }} title={t("insights.fixedN", { n: c.resolved })} />
                </div>
                <span className="text-sm tabular-nums text-ink-2 sm:w-36 sm:text-end">
                  {t("insights.openFixed", { open: c.open, fixed: c.resolved })}
                </span>
              </div>
            ))}
          <div className="flex gap-5 border-t border-line pt-4 text-sm font-medium text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[2px] bg-chart-open" />
              {t("status.open")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[2px] bg-lime-600" />
              {t("home.statFixed")}
            </span>
          </div>
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
