import { listIssues } from "@/lib/db";
import {
  anonymousLeaderboard,
  cityOverview,
  contributors,
  neighborhoodStats,
  officeRecords,
  predictiveInsights,
} from "@/lib/insights";
import { dataWorld } from "@/lib/roles";

/**
 * Public: Insights for everyone, with no reporter identity anywhere in the response.
 * After the Issues are read, the three lookups that need the database run at the same time, so the page waits
 * for the slowest one rather than for all of them in a row.
 */
export async function GET() {
  const { demo } = await dataWorld();
  const issues = await listIssues(demo);
  const [overview, leaders, offices] = await Promise.all([cityOverview(issues, demo), contributors(demo), officeRecords(demo)]);
  return Response.json({
    overview,
    neighborhoods: neighborhoodStats(issues),
    predictive: predictiveInsights(issues),
    leaderboard: anonymousLeaderboard(leaders.slice(0, 10)),
    offices,
  });
}
