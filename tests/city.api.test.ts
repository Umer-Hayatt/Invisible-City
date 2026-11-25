import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as city } from "../app/api/city/route";
import { GET as listIssues } from "../app/api/issues/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { EXAMPLES_BELOW } from "../lib/city";
import { setSession } from "../lib/session";
import type { Issue } from "../lib/types";
import { ctx, SUPER_ADMIN, signInAs, signInDemo, startTestApp } from "./helpers";

/**
 * The city map: a Citizen of the real world, which starts empty, sees Example Issues and figures instead of a blank
 * page. Examples are marked, stay out of every other list, go to no official, and stop once there are enough real ones.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, decision, decided_at, is_demo, area) VALUES
       ('City', 'city@gov.pk', 'approved', now(), false, NULL),
       ('G-9', 'g9@gov.pk', 'approved', now(), false, 'G-9'),
       ('F-7', 'f7@gov.pk', 'approved', now(), false, 'F-7')`,
  );
});
afterAll(() => app.stop());
beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
});

interface City { issues: Issue[]; examples: number; figures: { totalReports: number; resolved: number; avgResolutionDays: number | null } }
const read = async (): Promise<City> => (await city()).json();
const addReal = async (n: number) => {
  const rows = await app.sql.query<{ id: number }>(
    `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, created_at, updated_at)
     SELECT 'garbage', 'low', 'Real ' || g, 'x', 33.69, 73.03, 'G-9', 'open', 1, false, 1, now(), now() FROM generate_series(1, $1::int) g RETURNING id`,
    [n],
  );
  return rows.map((r) => r.id);
};

describe("the city map", () => {
  it("fills an empty real map with marked Example Issues and figures for Citizens and visitors", async () => {
    const visitor = () => {
      process.env.DEMO_MODE = "false";
      setSession(null);
    };
    for (const viewer of [() => signInAs("real@gmail.com"), visitor]) {
      viewer();
      const c = await read();
      expect(c.examples).toBe(87);
      expect(c.issues.every((i) => i.example)).toBe(true);
      expect(c.figures.resolved).toBeGreaterThan(0);
      expect(c.figures.totalReports).toBeGreaterThan(87);
      expect(c.figures.avgResolutionDays).toBeGreaterThan(0);
      // Only the map: the list of Issues stays real.
      expect((await (await listIssues(new Request("http://test/api/issues"))).json()).issues).toEqual([]);
    }
  });

  it("shows the Demo world its own Issues, not as examples", async () => {
    signInDemo("citizen");
    const c = await read();
    expect(c.examples).toBe(0);
    expect(c.issues).toHaveLength(87);
    expect(c.issues.some((i) => i.example)).toBe(false);
  });

  it("gives officials no Example Issues", async () => {
    for (const email of ["city@gov.pk", SUPER_ADMIN]) {
      signInAs(email);
      expect(await read()).toMatchObject({ examples: 0, issues: [] });
    }
  });

  it("puts real Issues first and drops the examples once there are enough", async () => {
    const ids = await addReal(2);
    signInAs("real@gmail.com");
    const c = await read();
    expect(c.issues.slice(0, 2).map((i) => i.id).sort()).toEqual(ids.sort());
    expect(c.issues.slice(0, 2).some((i) => i.example)).toBe(false);
    expect(c.examples).toBe(87);
    await addReal(EXAMPLES_BELOW - 2);
    expect((await read()).examples).toBe(0);
  });
});

describe("reporter contact details and areas", () => {
  it("go to the Authority of the Issue's area and of the whole city, not to another area's", async () => {
    const [issueId] = await addReal(1);
    const [p] = await app.sql.query<{ id: string }>(
      "INSERT INTO people (auth_id, email, display_name, phone) VALUES ('reporter', 'reporter@gmail.com', 'Reporter', '+92 300 9999999') RETURNING id",
    );
    await app.sql.query(
      `INSERT INTO reports (issue_id, reporter_id, description, lat, lng, ai_category, ai_severity, ai_confidence, ai_summary, ai_source, created_at)
       VALUES ($1, $2, 'x', 33.69, 73.03, 'garbage', 'low', 0.8, 'x', 'test', now())`,
      [issueId, p.id],
    );
    const page = async (email: string) => {
      signInAs(email);
      return JSON.stringify(await (await getIssue(new Request("http://test/x"), ctx({ id: String(issueId) }))).json());
    };
    for (const email of ["g9@gov.pk", "city@gov.pk"]) expect(await page(email)).toContain("reporter@gmail.com");
    const other = await page("f7@gov.pk");
    expect(other).toContain("Reporter");
    expect(other).not.toMatch(/reporter@gmail\.com|9999999/);
  });
});
