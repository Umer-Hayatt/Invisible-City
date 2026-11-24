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
import { dataWorld } from "@/lib/roles";

/**
 * Public: Insights for everyone. Reporter display names are in the response; never an email or a phone.
 * After the Issues are read, the three lookups that need the database run at the same time, so the page waits
 * for the slowest one rather than for all of them in a row.
 */
export async function GET() {
  const { demo } = await dataWorld();
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
