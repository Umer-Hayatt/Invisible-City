"use client";

import { ArrowRight, Building2, Flame, HardHat, Inbox, TriangleAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Gate from "@/components/Gate";
import { Card, CategoryIcon, CriticalTag, PageHeader, PageSkeleton, SectionTitle, Stat, StatusBadge, categoryLabel } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";
import { t } from "@/lib/i18n";
import type { NeighborhoodStat, OfficeRecord } from "@/lib/insights";
import { Category, Issue, isActive } from "@/lib/types";

/**
 * The Authority's Dashboard: an overview of the city today, borrowing a little from each place they work in.
 * Nothing is decided here; each block links to Reports, Offices or Insights, where the work happens.
 */
interface Stats {
  neighborhoods: NeighborhoodStat[];
  offices: OfficeRecord[];
  overview: { byCategory: { category: Category; open: number; resolved: number }[] };
}

export default function AuthorityDashboard() {
  return (
    <Gate roles={["authority"]} next="/admin">
      <Dashboard />
    </Gate>
  );
}

function Dashboard() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  // An Authority registered for one area: the server sends only that area's Issues; the rest is narrowed here.
  const [area, setArea] = useState<string | null>(null);
  useEffect(() => {
    api<{ issues: Issue[]; area: string | null }>("/api/issues")
      .then((d) => {
        setIssues(d.issues);
        setArea(d.area ?? null);
      })
      .catch(() => setIssues([]));
    api<Stats>("/api/stats").then(setStats).catch(() => {});
  }, []);
  if (!issues || !stats) return <PageSkeleton />;

  const active = issues.filter((i) => isActive(i.status));
  const mine = (sector: string) => !area || sector === area;
  const hoods = stats.neighborhoods.filter((n) => mine(n.name));
  const neglected = hoods.filter((n) => n.neglected);
  const urgent = active.slice(0, 5); // already sorted by priority
  const areas = hoods
    .filter((n) => n.total > 0)
    .sort((a, b) => b.reports - a.reports)
    .slice(0, 5);
  const offices = stats.offices.filter((o) => mine(o.sector)).sort((a, b) => b.assigned - a.assigned).slice(0, 4);
  const byCategory = area
    ? stats.overview.byCategory.map((c) => ({
        category: c.category,
        open: active.filter((i) => i.category === c.category).length,
        resolved: issues.filter((i) => i.category === c.category && i.status === "resolved").length,
      }))
    : stats.overview.byCategory;
  const cats = byCategory.filter((c) => c.open + c.resolved > 0).sort((a, b) => b.open + b.resolved - (a.open + a.resolved));
  const maxCat = Math.max(1, ...cats.map((c) => c.open + c.resolved));

  return (
    <div className="space-y-10">
      <PageHeader
        title={area ? t("authority.dashboardArea", { area }) : t("authority.dashboard")}
        sub={t("authority.dashboardSub")}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label={t("admin.statAwaiting")} value={active.filter((i) => i.status === "open").length} icon={Inbox} />
        <Stat label={t("status.assigned")} value={active.filter((i) => i.status === "assigned").length} icon={HardHat} />
        <Stat label={t("status.in_progress")} value={active.filter((i) => i.status === "in_progress").length} icon={Wrench} />
        <Stat label={t("admin.statCritical")} value={active.filter((i) => i.severity === "critical").length} icon={Flame} tone="bad" />
        <Stat
          label={t("admin.statNeglected")}
          value={neglected.length}
          hint={neglected.map((n) => n.name).join(", ") || t("home.none")}
          icon={TriangleAlert}
          tone={neglected.length ? "bad" : "good"}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section>
          <SectionTitle title={t("insights.byCategoryTitle")} sub={t("insights.byCategorySub")} />
          <Card className="space-y-4 p-6">
            {cats.map((c) => (
              <div key={c.category} className="grid items-center gap-x-4 gap-y-2 text-base sm:grid-cols-[210px_minmax(0,1fr)_auto]">
                <span className="flex items-center gap-2 font-semibold">
                  <CategoryIcon category={c.category} size={16} className="text-muted" />
                  {categoryLabel(c.category)}
                </span>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-[3px] bg-sunken">
                  <div className="bg-chart-open" style={{ width: `${(c.open / maxCat) * 100}%` }} title={t("insights.openN", { n: c.open })} />
                  <div className="bg-lime-600" style={{ width: `${(c.resolved / maxCat) * 100}%` }} title={t("insights.fixedN", { n: c.resolved })} />
                </div>
                <span className="text-sm tabular-nums text-ink-2 sm:w-32 sm:text-end">{t("insights.openFixed", { open: c.open, fixed: c.resolved })}</span>
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

        <section>
          <SectionTitle title={t("authority.needsAttention")} right={<More href="/admin/reports" label={t("authority.openQueue")} />} />
          <Card className="divide-y divide-line">
            {urgent.length === 0 && <p className="p-5 text-muted">{t("office.empty")}</p>}
            {urgent.map((i) => (
              <Link key={i.id} href={`/issues/${i.id}`} className="flex items-center gap-3 p-4 hover:bg-sunken">
                <span className="w-9 shrink-0 text-lg font-semibold tabular-nums">{i.priority}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{i.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                    {i.neighborhood} · {timeAgo(i.created_at)}
                    <CriticalTag severity={i.severity} status={i.status} />
                  </div>
                </div>
                <StatusBadge status={i.status} />
              </Link>
            ))}
          </Card>
        </section>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle title={t("insights.areasTitle")} right={<More href="/insights" label={t("nav.insights")} />} />
          <Card className="divide-y divide-line">
            {areas.map((n) => (
              <div key={n.name} className="flex items-center justify-between gap-3 p-4">
                <span className="text-lg font-semibold">
                  {n.name}
                  {n.neglected && <TriangleAlert size={15} className="ms-2 inline text-danger-ink" aria-label={t("insights.neglected")} />}
                </span>
                <span className="text-end text-sm text-ink-2">
                  <span className="block font-semibold tabular-nums text-ink">{t("insights.areaReports", { n: n.reports })}</span>
                  {t("insights.areaDetail", { issues: n.total, open: n.open, pct: Math.round(n.resolutionRate * 100) })}
                </span>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <SectionTitle title={t("insights.officesTitle")} right={<More href="/admin/offices" label={t("nav.offices")} />} />
          <Card className="divide-y divide-line">
            {offices.length === 0 && <p className="p-5 text-muted">{t("insights.officesEmpty")}</p>}
            {offices.map((o) => (
              <div key={o.officeId} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 truncate font-semibold">
                    <Building2 size={16} className="shrink-0 text-muted" /> {o.name}
                  </div>
                  <div className="text-sm text-muted">
                    {o.department}, {o.sector}
                  </div>
                </div>
                <div className="shrink-0 text-end text-sm text-ink-2">
                  <div className="font-semibold tabular-nums text-ink">{t("authority.officeLine", { assigned: o.assigned, fixes: o.fixes })}</div>
                  {o.avgDaysToFix !== null ? t("authority.officeDays", { n: o.avgDaysToFix }) : "-"}
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}

function More({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
      {label} <ArrowRight size={15} className="rtl:-scale-x-100" aria-hidden />
    </Link>
  );
}
