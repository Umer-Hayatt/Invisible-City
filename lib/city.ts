import { listIssues } from "./db";
import type { Actor } from "./roles";
import type { Issue } from "./types";

/** With fewer real Issues than this, the public city map is filled out with Example Issues. */
export const EXAMPLES_BELOW = 20;

export interface CityFigures {
  totalReports: number;
  resolved: number;
  avgResolutionDays: number | null;
}

/**
 * What the home page shows. Real Issues always; while the real world is nearly empty, Citizens and visitors also see
 * the Demo Issues, each marked `example`, so the map is not blank. Officials never get Example Issues.
 */
export async function cityMap(demo: boolean, actor: Actor | null) {
  const official = !!actor && actor.role !== "citizen";
  const area = actor?.role === "authority" ? (actor.area ?? undefined) : undefined;
  const own = await listIssues(demo, { neighborhood: area });
  const examples =
    demo || official || own.length >= EXAMPLES_BELOW
      ? []
      : (await listIssues(true)).map((i): Issue => ({ ...i, example: true }));
  const issues = [...own, ...examples];
  return { issues, figures: cityFigures(issues), examples: examples.length };
}

export function cityFigures(issues: Issue[]): CityFigures {
  const done = issues.filter((i) => i.status === "resolved" && i.resolved_at);
  const days = done.map((i) => (Date.parse(i.resolved_at!) - Date.parse(i.created_at)) / 86_400_000);
  return {
    totalReports: issues.reduce((n, i) => n + i.report_count, 0),
    resolved: done.length,
    avgResolutionDays: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null,
  };
}
