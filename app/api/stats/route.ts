import { listIssues } from "@/lib/db";
import {
  cityOverview,
  contributors,
  neighborhoodStats,
  officeCapacity,
  officeRecords,
  predictiveInsights,
  publicLeaderboard,
} from "@/lib/insights";
import { requireRole } from "@/lib/roles";

/**
 * Insights, for the Super Admin only. Reporter display names are in the response; never an email or a phone.
 * The home page's public figures come from /api/city; an Authority's Dashboard figures come from /api/area-overview.
 * After the Issues are read, the three lookups that need the database run at the same time, so the page waits
 * for the slowest one rather than for all of them in a row.
 */
export async function GET() {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  const demo = actor.isDemo;
  const [issues, capacity] = await Promise.all([listIssues(demo), officeCapacity(demo)]);
  const [overview, leaders, offices] = await Promise.all([
    cityOverview(issues, demo, capacity),
    contributors(demo),
    officeRecords(demo),
  ]);
  return Response.json({
    overview,
    neighborhoods: neighborhoodStats(issues, capacity),
    predictive: predictiveInsights(issues),
    leaderboard: publicLeaderboard(leaders),
    offices,
  });
}
