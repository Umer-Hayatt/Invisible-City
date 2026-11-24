import { nowMs } from "./clock";
import { sql } from "./sql";
import { NEIGHBORHOODS } from "./geo";
import { CATEGORY_META, Category, Issue, SEVERITY_WEIGHT, isActive } from "./types";

export interface NeighborhoodStat {
  name: string;
  lat: number;
  lng: number;
  total: number;
  open: number;
  resolved: number;
  /** Closed unconfirmed: counted apart, never as a Resolution. */
  unconfirmed: number;
  resolutionRate: number;
  avgResolutionDays: number | null;
  openSeverityLoad: number;
  healthScore: number;
  neglected: boolean;
  /** The city-wide resolution rate the neglect test compares against. */
  cityRate: number;
  neglectReason: string | null;
}

function days(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

export function neighborhoodStats(issues: Issue[]): NeighborhoodStat[] {
  const total = issues.length || 1;
  const cityRate = issues.filter((i) => i.status === "resolved").length / total;

  const stats = NEIGHBORHOODS.map((n) => {
    const mine = issues.filter((i) => i.neighborhood === n.name);
    const resolved = mine.filter((i) => i.status === "resolved");
    const open = mine.filter((i) => isActive(i.status));
    const unconfirmed = mine.filter((i) => i.status === "closed_unconfirmed").length;
    const resolutionRate = mine.length ? resolved.length / mine.length : 1;
    const avgResolutionDays = resolved.length
      ? resolved.reduce((s, i) => s + days(i.created_at, i.resolved_at!), 0) / resolved.length
      : null;
    // Each open issue weighs by severity and gets heavier the longer it is ignored.
    const openSeverityLoad = open.reduce((s, i) => {
      const age = days(i.created_at, new Date(nowMs()).toISOString());
      return s + SEVERITY_WEIGHT[i.severity] * (1 + Math.min(1, age / 30));
    }, 0);
    const healthScore = Math.round(
      0.55 * Math.max(0, 100 - openSeverityLoad * 4) + 0.45 * resolutionRate * 100,
    );
    const neglected = mine.length >= 3 && resolutionRate < 0.35 && resolutionRate < cityRate * 0.6;
    return {
      name: n.name,
      lat: n.lat,
      lng: n.lng,
      total: mine.length,
      open: open.length,
      resolved: resolved.length,
      unconfirmed,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      avgResolutionDays: avgResolutionDays === null ? null : Math.round(avgResolutionDays * 10) / 10,
      openSeverityLoad: Math.round(openSeverityLoad * 10) / 10,
      healthScore,
      neglected,
      cityRate: Math.round(cityRate * 100) / 100,
      // English summary for API readers; screens build their own sentence from the numbers in the chosen language.
      neglectReason: neglected
        ? `Only ${resolved.length} of ${mine.length} complaints resolved (${Math.round(
            resolutionRate * 100,
          )}% vs city average ${Math.round(cityRate * 100)}%)`
        : null,
    };
  });
  return stats.sort((a, b) => a.healthScore - b.healthScore);
}

export interface PredictiveInsight {
  neighborhood: string;
  category: Category;
  count: number;
  open: number;
  /** How many of them came back after a repair. */
  recurring: number;
  /** English summary for API readers; screens build their own sentence from the fields above. */
  message: string;
}

/** Recurring problem clusters in the last 120 days → candidates for preventive work. */
export function predictiveInsights(issues: Issue[]): PredictiveInsight[] {
  const cutoff = nowMs() - 120 * 86_400_000;
  const groups = new Map<string, Issue[]>();
  for (const i of issues) {
    if (new Date(i.created_at).getTime() < cutoff) continue;
    const key = `${i.neighborhood}|${i.category}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }
  const out: PredictiveInsight[] = [];
  for (const [key, list] of groups) {
    const recurring = list.filter((i) => i.recurrence_of).length;
    if (list.length < 3 && recurring === 0) continue;
    const [neighborhood, category] = key.split("|") as [string, Category];
    const label = CATEGORY_META[category].label.toLowerCase();
    const advice: Partial<Record<Category, string>> = {
      road_damage: "Consider resurfacing the stretch instead of patching individual potholes.",
      garbage: "Increase collection frequency or add bins.",
      streetlight: "Inspect the feeder circuit rather than replacing bulbs one by one.",
      water_leak: "Pipe network may be ageing - schedule a pressure inspection.",
      drainage: "Clean the drain line before the monsoon.",
    };
    out.push({
      neighborhood,
      category,
      count: list.length,
      open: list.filter((i) => isActive(i.status)).length,
      recurring,
      message: `${list.length} ${label} reports in ${neighborhood} in 120 days${
        recurring ? ` (${recurring} recurred after repair)` : ""
      }. ${advice[category] ?? "Investigate the root cause."}`,
    });
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 8);
}

export interface Contributor {
  reporter_id: string;
  name: string;
  reports: number;
  corroborated: number;
  resolved: number;
  firstReports: number;
  score: number;
}

/**
 * Citizen Impact Score: 10 per report, +5 if other citizens corroborated the same
 * issue, +15 for being first to report it, +20 when the issue was actually fixed.
 */
export async function contributors(demo: boolean, authId?: string): Promise<Contributor[]> {
  const rows = await sql().query<{
    reporter_id: string;
    reporter_name: string | null;
    issue_id: number;
    id: number;
    status: string;
    report_count: number;
    first_id: number;
  }>(
    // "First to report" is the lowest non-spam Report id on the Issue, worked out in one pass (a window
    // function) rather than a subquery per row. Deleted Reports still count as first, as before.
    `SELECT x.reporter_id, x.reporter_name, x.issue_id, x.id, x.status, x.report_count, x.first_id
     FROM (
       SELECT r.reporter_id, p.display_name AS reporter_name, p.auth_id, r.issue_id, r.id, r.deleted_at,
              i.status, i.report_count, MIN(r.id) OVER (PARTITION BY r.issue_id) AS first_id
       FROM reports r JOIN issues i ON i.id = r.issue_id JOIN people p ON p.id = r.reporter_id
       WHERE NOT r.is_spam AND i.deleted_at IS NULL AND i.is_demo = $1
     ) x
     WHERE x.deleted_at IS NULL${authId ? " AND x.auth_id = $2" : ""}`,
    authId ? [demo, authId] : [demo],
  );
  const map = new Map<string, Contributor>();
  for (const r of rows) {
    const c = map.get(r.reporter_id) ?? {
      reporter_id: r.reporter_id,
      name: r.reporter_name || "Anonymous citizen",
      reports: 0,
      corroborated: 0,
      resolved: 0,
      firstReports: 0,
      score: 0,
    };
    c.reports++;
    if (r.report_count > 1) c.corroborated++;
    if (r.status === "resolved") c.resolved++;
    if (r.first_id === r.id) c.firstReports++;
    c.score = c.reports * 10 + c.corroborated * 5 + c.firstReports * 15 + c.resolved * 20;
    map.set(r.reporter_id, c);
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function cityOverview(issues: Issue[], demo: boolean) {
  const resolved = issues.filter((i) => i.status === "resolved");
  const open = issues.filter((i) => isActive(i.status));
  const unconfirmed = issues.filter((i) => i.status === "closed_unconfirmed").length;
  const hoods = neighborhoodStats(issues).filter((n) => n.total > 0);
  const [{ n: reportCount }] = await sql().query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM reports r JOIN issues i ON i.id = r.issue_id WHERE NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL AND i.is_demo = $1",
    [demo],
  );
  return {
    totalIssues: issues.length,
    totalReports: reportCount,
    duplicatesMerged: reportCount - issues.length,
    open: open.length,
    resolved: resolved.length,
    unconfirmed,
    critical: open.filter((i) => i.severity === "critical").length,
    resolutionRate: issues.length ? Math.round((resolved.length / issues.length) * 100) : 0,
    avgResolutionDays: resolved.length
      ? Math.round(
          (resolved.reduce((s, i) => s + days(i.created_at, i.resolved_at!), 0) / resolved.length) * 10,
        ) / 10
      : null,
    cityHealth: hoods.length
      ? Math.round(hoods.reduce((s, n) => s + n.healthScore, 0) / hoods.length)
      : 100,
    byCategory: Object.keys(CATEGORY_META).map((c) => ({
      category: c,
      open: open.filter((i) => i.category === c).length,
      resolved: resolved.filter((i) => i.category === c).length,
    })),
  };
}

/** The public leaderboard: scores only. Names stay with Authorities and the assigned Office (PRD: reporter identity). */
export type PublicContributor = Omit<Contributor, "reporter_id" | "name">;
export const anonymousLeaderboard = (list: Contributor[]): PublicContributor[] =>
  list.map(({ reports, corroborated, resolved, firstReports, score }) => ({ reports, corroborated, resolved, firstReports, score }));

export interface OfficeRecord {
  officeId: number;
  name: string;
  department: string;
  sector: string;
  /** Issues the Office holds now, at any stage after Assignment (a sent-back Issue leaves the Office). */
  assigned: number;
  fixes: number;
  rejections: number;
  resolutions: number;
  unconfirmed: number;
  /** From the latest Assignment to the latest Fix, averaged over Issues that have a Fix. */
  avgDaysToFix: number | null;
}

/** Office track record for Insights: one row per Office that has held at least one Issue. */
export async function officeRecords(demo: boolean): Promise<OfficeRecord[]> {
  const [issues, events] = await Promise.all([
    sql().query<{
      id: number;
      office_id: number;
      office: string;
      department: string;
      sector: string;
      status: string;
      fixed_at: string | null;
      resolved_at: string | null;
    }>(
      `SELECT i.id, i.office_id, o.name AS office, d.name AS department, o.sector, i.status, i.fixed_at, i.resolved_at
       FROM issues i JOIN offices o ON o.id = i.office_id JOIN departments d ON d.id = o.department_id
       WHERE i.deleted_at IS NULL AND i.is_demo = $1`,
      [demo],
    ),
    sql().query<{ issue_id: number; kind: string; created_at: string }>(
      `SELECT e.issue_id, e.kind, e.created_at FROM events e JOIN issues i ON i.id = e.issue_id
       WHERE e.kind IN ('assigned', 'fixed', 'rejected') AND i.office_id IS NOT NULL AND i.deleted_at IS NULL AND i.is_demo = $1
       ORDER BY e.created_at, e.id`,
      [demo],
    ),
  ]);
  const byIssue = new Map<number, typeof events>();
  for (const e of events) byIssue.set(e.issue_id, [...(byIssue.get(e.issue_id) ?? []), e]);

  const rows = new Map<number, OfficeRecord & { fixDays: number[] }>();
  for (const i of issues) {
    const r = rows.get(i.office_id) ?? {
      officeId: i.office_id,
      name: i.office,
      department: i.department,
      sector: i.sector,
      assigned: 0,
      fixes: 0,
      rejections: 0,
      resolutions: 0,
      unconfirmed: 0,
      avgDaysToFix: null,
      fixDays: [],
    };
    rows.set(i.office_id, r);
    const evs = byIssue.get(i.id) ?? [];
    const fixedEvents = evs.filter((e) => e.kind === "fixed");
    // Issues finished before Fix events were recorded still count one Fix, at the time they were fixed or resolved.
    const fixedNow = i.status === "fixed" || i.status === "resolved" || i.status === "closed_unconfirmed";
    const fixes = fixedEvents.length || (fixedNow ? 1 : 0);
    r.assigned++;
    r.fixes += fixes;
    r.rejections += evs.filter((e) => e.kind === "rejected").length;
    if (i.status === "resolved") r.resolutions++;
    if (i.status === "closed_unconfirmed") r.unconfirmed++;
    const lastFix = fixedEvents.at(-1)?.created_at ?? (fixedNow ? (i.fixed_at ?? i.resolved_at) : null);
    const assignedAt = lastFix
      ? evs.filter((e) => e.kind === "assigned" && e.created_at <= lastFix).at(-1)?.created_at
      : undefined;
    if (lastFix && assignedAt) r.fixDays.push(days(assignedAt, lastFix));
  }
  return [...rows.values()]
    .map(({ fixDays, ...r }) => ({
      ...r,
      avgDaysToFix: fixDays.length ? Math.round((fixDays.reduce((a, b) => a + b, 0) / fixDays.length) * 10) / 10 : null,
    }))
    .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name));
}
