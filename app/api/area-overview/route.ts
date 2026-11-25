import { listIssues } from "@/lib/db";
import { cityOverview, neighborhoodStats, officeCapacity, officeRecords } from "@/lib/insights";
import { requireRole } from "@/lib/roles";

/**
 * The figures behind an Authority's Dashboard and Reports page: the city overview, each sector's numbers and each
 * Business's record. The Authority's page narrows them to its own area. No reporter names, no predictions or leaderboard:
 * those are Insights, which only the Super Admin sees (/api/stats).
 */
export async function GET() {
  const actor = await requireRole("authority", "super_admin");
  if (actor instanceof Response) return actor;
  const demo = actor.isDemo;
  const [issues, capacity] = await Promise.all([listIssues(demo), officeCapacity(demo)]);
  const [overview, offices] = await Promise.all([cityOverview(issues, demo, capacity), officeRecords(demo)]);
  return Response.json({ overview, neighborhoods: neighborhoodStats(issues, capacity), offices });
}
