"use client";

import { Activity, Building2, Medal, TrendingUp, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import CityMap from "@/components/CityMap";
import { Card, CategoryIcon, PageHeader, SectionTitle, categoryLabel, healthColor } from "@/components/ui";
import { api } from "@/lib/client";
import { MessageKey, t } from "@/lib/i18n";
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
  useEffect(() => {
    api<Stats>("/api/stats").then(setS).catch(() => {});
  }, []);
  if (!s) return <div className="text-muted">{t("gate.loading")}</div>;
  const hoods = s.neighborhoods.filter((n) => n.total > 0);
  const neglected = hoods.filter((n) => n.neglected);
  const maxCat = Math.max(1, ...s.overview.byCategory.map((c) => c.open + c.resolved));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t("insights.eyebrow")}
        title={t("insights.title")}
        sub={t("insights.sub")}
      />

      <section>
        <SectionTitle title={t("insights.healthTitle")} sub={t("insights.healthSub")} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="overflow-hidden">
            <CityMap neighborhoods={s.neighborhoods} layer="health" className="h-[520px]" />
          </Card>
          <Card className="overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-start text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-start">{t("insights.colSector")}</th>
                    <th className="py-3 text-start">{t("insights.colHealth")}</th>
                    <th className="py-3 text-start">{t("insights.colFixed")}</th>
                    <th className="py-3 pe-5 text-end">{t("insights.colAvgFix")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {hoods.map((n) => (
                    <tr key={n.name} className={n.neglected ? "bg-red-50/60" : ""}>
                      <td className="px-5 py-3">
                        <div className="font-bold">{n.name}</div>
                        {n.neglected && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-red-700">
                            <TriangleAlert size={11} /> {t("insights.neglected")}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-sunken">
                            <div className="h-full rounded-full" style={{ width: `${n.healthScore}%`, background: healthColor(n.healthScore) }} />
                          </div>
                          <span className="w-6 font-bold tabular-nums">{n.healthScore}</span>
                        </div>
                      </td>
                      <td className="py-3 tabular-nums text-ink-2">
                        {n.resolved}/{n.total} <span className="text-muted">· {Math.round(n.resolutionRate * 100)}%</span>
                        {n.unconfirmed > 0 && (
                          <div className="text-[11px] text-muted">{t("insights.unconfirmedShort", { n: n.unconfirmed })}</div>
                        )}
                      </td>
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

      <section className="grid gap-6 lg:grid-cols-3">
        <InsightCard icon={TriangleAlert} tint="bg-red-50 text-red-700" title={t("insights.neglectTitle")} sub={t("insights.neglectSub")}>
          {neglected.length === 0 ? (
            <p className="text-sm text-muted">{t("insights.neglectNone")}</p>
          ) : (
            neglected.map((n) => (
              <div key={n.name} className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{n.name}</span>
                  <span className="text-lg font-extrabold text-red-700 tabular-nums">{Math.round(n.resolutionRate * 100)}%</span>
                </div>
                <div className="text-xs text-ink-2">
                  {t("insights.neglectReason", {
                    resolved: n.resolved,
                    total: n.total,
                    rate: Math.round(n.resolutionRate * 100),
                    city: Math.round(n.cityRate * 100),
                  })}
                </div>
              </div>
            ))
          )}
        </InsightCard>

        <InsightCard icon={TrendingUp} tint="bg-violet-50 text-violet-700" title={t("insights.predictTitle")} sub={t("insights.predictSub")}>
          {s.predictive.length === 0 && <p className="text-sm text-muted">{t("insights.predictNone")}</p>}
          {s.predictive.map((p) => (
            <div key={p.neighborhood + p.category} className="flex gap-3 rounded-xl border border-line p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <CategoryIcon category={p.category} size={16} />
              </div>
              <div className="text-sm leading-snug text-ink-2">
                {t("insights.predictCluster", { n: p.count, category: categoryLabel(p.category), place: p.neighborhood })}
                {p.recurring > 0 && ` ${t("insights.predictRecurred", { n: p.recurring })}`} {t(ADVICE[p.category] ?? "insights.advice.other")}
              </div>
            </div>
          ))}
        </InsightCard>

        <InsightCard icon={Medal} tint="bg-accent-50 text-amber-700" title={t("insights.leaderTitle")} sub={t("insights.leaderSub")}>
          <ol className="divide-y divide-line">
            {s.leaderboard.map((c, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-accent text-ink" : i < 3 ? "bg-ink text-white" : "bg-sunken text-ink-2"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold">{t("insights.anonymousCitizen")}</span>
                <span className="text-xs text-muted">{t("office.reports", { n: c.reports })}</span>
                <span className="w-10 text-end font-extrabold tabular-nums">{c.score}</span>
              </li>
            ))}
          </ol>
        </InsightCard>
      </section>

      <section>
        <SectionTitle title={t("insights.officesTitle")} sub={t("insights.officesSub")} />
        <Card className="overflow-hidden">
          {s.offices.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("insights.officesEmpty")}</p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-surface text-[11px] font-bold uppercase tracking-wider text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-start">{t("insights.colOffice")}</th>
                    <th className="py-3 text-end">{t("insights.colAssigned")}</th>
                    <th className="py-3 text-end">{t("insights.colFixes")}</th>
                    <th className="py-3 text-end">{t("insights.colRejections")}</th>
                    <th className="py-3 text-end">{t("insights.colUnconfirmed")}</th>
                    <th className="py-3 pe-5 text-end">{t("insights.colAvgDays")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {s.offices.map((o) => (
                    <tr key={o.officeId}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 font-bold">
                          <Building2 size={14} className="shrink-0 text-muted" /> {o.name}
                        </div>
                        <div className="text-[11px] text-muted">
                          {o.department} · {o.sector}
                        </div>
                      </td>
                      <td className="py-3 text-end tabular-nums">{o.assigned}</td>
                      <td className="py-3 text-end tabular-nums">{o.fixes}</td>
                      <td className={`py-3 text-end tabular-nums ${o.rejections ? "font-semibold text-red-700" : ""}`}>{o.rejections}</td>
                      <td className="py-3 text-end tabular-nums">{o.unconfirmed}</td>
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
              <div key={c.category} className="grid grid-cols-[minmax(140px,200px)_1fr_auto] items-center gap-4 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <CategoryIcon category={c.category} size={16} className="text-muted" />
                  {categoryLabel(c.category)}
                </span>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken">
                  <div className="rounded-full bg-orange-500" style={{ width: `${(c.open / maxCat) * 100}%` }} title={t("insights.openN", { n: c.open })} />
                  <div className="rounded-full bg-brand" style={{ width: `${(c.resolved / maxCat) * 100}%` }} title={t("insights.fixedN", { n: c.resolved })} />
                </div>
                <span className="w-28 text-end text-xs tabular-nums text-muted">
                  <b className="text-orange-600">{t("insights.openN", { n: c.open })}</b> · <b className="text-brand">{t("insights.fixedN", { n: c.resolved })}</b>
                </span>
              </div>
            ))}
          <div className="flex gap-5 border-t border-line pt-4 text-xs font-medium text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              {t("status.open")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              {t("home.statFixed")}
            </span>
            <span className="ms-auto flex items-center gap-1.5 text-muted">
              <Activity size={13} /> {t("insights.live")}
            </span>
          </div>
        </Card>
      </section>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tint,
  title,
  sub,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  tint: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={20} />
      </div>
      <h3 className="mt-4 font-bold tracking-tight">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{sub}</p>
      <div className="mt-4 space-y-2">{children}</div>
    </Card>
  );
}
