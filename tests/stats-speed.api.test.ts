import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as areaOverview } from "../app/api/area-overview/route";
import { GET as stats } from "../app/api/stats/route";
import { contributors } from "../lib/insights";
import { setSession } from "../lib/session";
import { signInDemo, startTestApp } from "./helpers";

/**
 * The faster Insights queries must give exactly the answers the old ones did. The leaderboard's "first to
 * report" is checked against the original per-row subquery on the whole demo seed.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());

describe("Insights after the speed-up", () => {
  it("counts first Reports exactly as the original subquery did", async () => {
    const old = await app.sql.query<{ reporter_id: string; first: number }>(
      `SELECT r.reporter_id, COUNT(*) FILTER (WHERE r.id = (SELECT MIN(id) FROM reports r2 WHERE r2.issue_id = r.issue_id AND NOT r2.is_spam))::int AS first
       FROM reports r JOIN issues i ON i.id = r.issue_id
       WHERE NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL AND i.is_demo
       GROUP BY r.reporter_id`,
    );
    const now = await contributors(true);
    const expected = Object.fromEntries(old.map((r) => [r.reporter_id, r.first]));
    expect(now.length).toBe(old.length);
    for (const c of now) expect(c.firstReports).toBe(expected[c.reporter_id]);
  });

  it("still returns every part of the Insights response", async () => {
    for (const who of ["citizen", "office", "authority"] as const) {
      signInDemo(who);
      expect((await stats()).status).toBe(403);
    }
    setSession(null);
    expect((await stats()).status).toBe(401);
    signInDemo("superAdmin");
    const body = await (await stats()).json();
    expect(body.overview.totalIssues).toBeGreaterThan(0);
    expect(body.neighborhoods.length).toBeGreaterThan(0);
    expect(body.leaderboard.length).toBeGreaterThan(0);
    expect(body.offices.length).toBeGreaterThan(0);
    expect(body.offices.some((o: { avgDaysToFix: number | null }) => o.avgDaysToFix !== null)).toBe(true);
  });

  it("gives an Authority the area figures but no Insights", async () => {
    signInDemo("authority");
    expect((await stats()).status).toBe(403);
    const body = await (await areaOverview()).json();
    expect(body.overview.totalIssues).toBeGreaterThan(0);
    expect(body.neighborhoods.length).toBeGreaterThan(0);
    expect(body.offices.length).toBeGreaterThan(0);
    expect(body.leaderboard).toBeUndefined();
    expect(body.predictive).toBeUndefined();
    signInDemo("citizen");
    expect((await areaOverview()).status).toBe(403);
  });
});
