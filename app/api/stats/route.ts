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

/** Public: Insights for everyone, with no reporter identity anywhere in the response. */
export async function GET() {
  const { demo } = await dataWorld();
  const issues = await listIssues(demo);
  return Response.json({
    overview: await cityOverview(issues, demo),
    neighborhoods: neighborhoodStats(issues),
    predictive: predictiveInsights(issues),
    leaderboard: anonymousLeaderboard((await contributors(demo)).slice(0, 10)),
    offices: await officeRecords(demo),
  });
}
