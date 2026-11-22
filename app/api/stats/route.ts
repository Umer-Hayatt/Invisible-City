import { listIssues } from "@/lib/db";
import { cityOverview, contributors, neighborhoodStats, predictiveInsights } from "@/lib/insights";
import { dataWorld } from "@/lib/roles";

export async function GET() {
  const { demo } = await dataWorld();
  const issues = await listIssues(demo);
  return Response.json({
    overview: await cityOverview(issues, demo),
    neighborhoods: neighborhoodStats(issues),
    predictive: predictiveInsights(issues),
    leaderboard: (await contributors(demo)).slice(0, 10),
  });
}
