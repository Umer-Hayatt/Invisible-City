import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as stats } from "../app/api/stats/route";
import { signInDemo, startTestApp } from "./helpers";

/**
 * Fixes of 24 November (Authority side): Insights back their findings with evidence, and list the areas with the
 * most Reports instead of the Citizens who reported most.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());

interface Ev { id: number; title: string; status: string; days: number; recurrenceOf: number | null }
interface Hood { name: string; total: number; reports: number; neglected: boolean; waiting: Ev[] }
interface Cluster { neighborhood: string; recurring: number; issues: Ev[] }

describe("evidence behind the Insights", () => {
  it("counts every Report per sector, which is at least the number of Issues there", async () => {
    signInDemo("superAdmin");
    const { neighborhoods } = (await (await stats()).json()) as { neighborhoods: Hood[] };
    const [{ n }] = await app.sql.query<{ n: number }>(
      "SELECT COALESCE(SUM(report_count), 0)::int AS n FROM issues WHERE is_demo AND deleted_at IS NULL",
    );
    expect(neighborhoods.reduce((s, h) => s + h.reports, 0)).toBe(n);
    for (const h of neighborhoods) expect(h.reports).toBeGreaterThanOrEqual(h.total);
  });

  it("lists the Issues each neglected sector has left waiting, oldest first", async () => {
    signInDemo("superAdmin");
    const { neighborhoods } = (await (await stats()).json()) as { neighborhoods: Hood[] };
    const neglected = neighborhoods.filter((h) => h.neglected);
    expect(neglected.length).toBeGreaterThan(0);
    for (const h of neglected) {
      expect(h.waiting.length).toBeGreaterThan(0);
      expect(h.waiting.length).toBeLessThanOrEqual(3);
      for (const w of h.waiting) expect(["open", "assigned"]).toContain(w.status);
      const ages = h.waiting.map((w) => w.days);
      expect([...ages].sort((a, b) => b - a)).toEqual(ages);
    }
  });

  it("names the Reports behind each repeat-problem cluster, a repair that failed first", async () => {
    signInDemo("superAdmin");
    const { predictive } = (await (await stats()).json()) as { predictive: Cluster[] };
    expect(predictive.length).toBeGreaterThan(0);
    for (const c of predictive) expect(c.issues.length).toBeGreaterThan(0);
    const recurring = predictive.find((c) => c.recurring > 0);
    expect(recurring).toBeTruthy();
    expect(recurring!.issues[0].recurrenceOf).not.toBeNull();
  });
});
