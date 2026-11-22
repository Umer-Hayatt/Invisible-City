import { listIssues } from "@/lib/db";
import { cityOverview, contributors, neighborhoodStats, predictiveInsights } from "@/lib/insights";

export async function GET() {
  const issues = await listIssues();
  return Response.json({
    overview: await cityOverview(issues),
    neighborhoods: neighborhoodStats(issues),
    predictive: predictiveInsights(issues),
    leaderboard: (await contributors()).slice(0, 10),
  });
}
