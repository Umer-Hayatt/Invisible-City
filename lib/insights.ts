import { nowMs } from "./clock";
import { sql } from "./sql";
import { NEIGHBORHOODS } from "./geo";
import { CATEGORY_META, Category, Issue, SEVERITY_WEIGHT } from "./types";

export interface NeighborhoodStat {
  name: string;
  lat: number;
  lng: number;
  total: number;
  open: number;
  resolved: number;
  resolutionRate: number;
  avgResolutionDays: number | null;
  openSeverityLoad: number;
  healthScore: number;
  neglected: boolean;
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
    const open = mine.filter((i) => i.status !== "resolved");
    const resolutionRate = mine.length ? resolved.length / mine.length : 1;
    const avgResolutionDays = resolved.length
      ? resolved.reduce((s, i) => s + days(i.created_at, i.resolved_at!), 0) / resolved.length
      : null;
    // Each open issue weighs by severity and gets heavier the longer it is ignored.
    const openSeverityLoad = open.reduce((s, i) => {
      const age = days(i.created_at, new Date().toISOString());
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
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      avgResolutionDays: avgResolutionDays === null ? null : Math.round(avgResolutionDays * 10) / 10,
      openSeverityLoad: Math.round(openSeverityLoad * 10) / 10,
      healthScore,
      neglected,
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
      open: list.filter((i) => i.status !== "resolved").length,
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
export async function contributors(authId?: string): Promise<Contributor[]> {
  const rows = await sql().query<{
    reporter_id: string;
    reporter_name: string | null;
    issue_id: number;
    id: number;
    status: string;
    report_count: number;
    first_id: number;
  }>(
    `SELECT r.reporter_id, p.display_name AS reporter_name, r.issue_id, r.id, i.status, i.report_count,
            (SELECT MIN(id) FROM reports r2 WHERE r2.issue_id = r.issue_id AND NOT r2.is_spam) AS first_id
     FROM reports r JOIN issues i ON i.id = r.issue_id JOIN people p ON p.id = r.reporter_id
     WHERE NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL${authId ? " AND p.auth_id = $1" : ""}`,
    authId ? [authId] : [],
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

export async function cityOverview(issues: Issue[]) {
  const resolved = issues.filter((i) => i.status === "resolved");
  const open = issues.filter((i) => i.status !== "resolved");
  const hoods = neighborhoodStats(issues).filter((n) => n.total > 0);
  const [{ n: reportCount }] = await sql().query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM reports WHERE NOT is_spam AND deleted_at IS NULL",
  );
  return {
    totalIssues: issues.length,
    totalReports: reportCount,
    duplicatesMerged: reportCount - issues.length,
    open: open.length,
    resolved: resolved.length,
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
