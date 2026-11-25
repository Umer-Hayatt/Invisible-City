import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as confirm } from "../app/api/issues/[id]/confirm/route";
import { POST as fix } from "../app/api/issues/[id]/fix/route";
import { POST as reject } from "../app/api/issues/[id]/reject/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { POST as start } from "../app/api/issues/[id]/start/route";
import { GET as listIssues } from "../app/api/issues/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as listOffices, POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { POST as submitReport } from "../app/api/reports/route";
import { GET as city } from "../app/api/city/route";
import { GET as stats } from "../app/api/stats/route";
import { GET as businesses } from "../app/api/super-admin/businesses/route";
import { DELETE as revokeBusiness } from "../app/api/super-admin/businesses/[id]/route";
import { setAnalyzer } from "../lib/ai";
import { advanceClock, setClock } from "../lib/clock";
import { NEIGHBORHOODS } from "../lib/geo";
import { setSession } from "../lib/session";
import { assign, ctx, NOW, SUPER_ADMIN, signInAs, signInDemo, startTestApp } from "./helpers";

/**
 * Ticket 07: Insights follow the real workflow. A Resolution moves the neighbourhood numbers, an
 * Unconfirmed closure is counted apart, each Office has a track record, and nothing public names a reporter.
 * The workflow runs in the real (non-demo) world, which starts empty, so every number here is ours.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;
const F7 = NEIGHBORHOODS.find((n) => n.name === "F-7")!;

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    "INSERT INTO access_requests (name, official_email, decision, is_demo) VALUES ('Ayesha', 'official@gov.pk', 'approved', false)",
  );
  signInAs("official@gov.pk");
  const { departments } = await (await listOffices()).json();
  const departmentId = departments.find((d: { name: string }) => d.name === "Roads").id;
  roads = (await (await addOffice(json({ name: "F-7 Roads Office", departmentId, sector: "F-7", lat: F7.lat, lng: F7.lng }))).json()).id;
  await addStaff(json({ email: "crew@gov.pk" }), id(roads));
});
afterAll(() => app.stop());

beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
  setClock(NOW);
  setAnalyzer(async () => ({
    is_civic_issue: true,
    category: "road_damage",
    severity: "high",
    confidence: 0.9,
    title: "Deep pothole",
    summary: "A deep pothole in the road.",
    hazards: [],
    source: "gemini",
  }));
});
afterEach(() => setAnalyzer(null));

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const id = (n: number) => ctx({ id: String(n) });
const read = async (res: Response) => res.json();

interface Hood { name: string; total: number; open: number; resolved: number; unconfirmed: number; resolutionRate: number; healthScore: number }
interface Office { officeId: number; name: string; assigned: number; fixes: number; rejections: number; resolutions: number; unconfirmed: number; avgDaysToFix: number | null }
interface Stats {
  overview: { totalIssues: number; open: number; resolved: number; unconfirmed: number; resolutionRate: number };
  neighborhoods: Hood[];
  offices: Office[];
  leaderboard: Record<string, unknown>[];
}
/** Insights as a real Super Admin sees them (the real world, not the Demo one). */
async function realStats(): Promise<Stats> {
  signInAs(SUPER_ADMIN);
  return read(await stats());
}
const f7 = (s: Stats) => s.neighborhoods.find((n) => n.name === "F-7")!;
const roadsRecord = (s: Stats) => s.offices.find((o) => o.officeId === roads)!;

let spot = 0;
/** A Citizen with a full profile reports a pothole at a fresh spot in F-7; returns the Issue id. */
async function report(who: string) {
  spot++;
  signInAs(`${who}@gmail.com`);
  await saveProfile(json({ displayName: `Name-${who}`, phone: "0300 7654321" }, "PUT"));
  const f = new FormData();
  f.set("lat", String(F7.lat + spot * 0.0015));
  f.set("lng", String(F7.lng + spot * 0.0015));
  f.set("description", "Pothole near the market");
  f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
  const res = await submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
  expect(res.status).toBe(200);
  return (await res.json()).issueId as number;
}
const ok = (res: Response) => expect(res.status).toBe(200);
async function assignAndFix(n: number) {
  signInAs("official@gov.pk");
  ok(await assign(n, roads));
  advanceClock(2 * 86_400_000); // two days after Assignment
  signInAs("crew@gov.pk");
  ok(await start(json({}), id(n)));
  const f = new FormData();
  f.set("afterImage", new File([new Uint8Array([4, 5, 6])], "after.jpg", { type: "image/jpeg" }));
  ok(await fix(new Request("http://test/x", { method: "POST", body: f }), id(n)));
}

describe("Insights follow the workflow (real world)", () => {
  it("a Resolution changes the neighbourhood numbers and the Office track record", async () => {
    const n = await report("hina");
    const before = await realStats();
    expect(f7(before)).toMatchObject({ total: 1, open: 1, resolved: 0, resolutionRate: 0 });

    await assignAndFix(n);
    // A Fix waiting for an answer is still active, not yet a Resolution.
    expect(f7(await realStats())).toMatchObject({ open: 1, resolved: 0 });

    signInAs("hina@gmail.com");
    ok(await confirm(json({}), id(n)));
    const after = await realStats();
    expect(f7(after)).toMatchObject({ total: 1, open: 0, resolved: 1, unconfirmed: 0, resolutionRate: 1 });
    expect(f7(after).healthScore).toBeGreaterThan(f7(before).healthScore);
    expect(after.overview).toMatchObject({ resolved: 1, open: 0, resolutionRate: 100 });
    expect(roadsRecord(after)).toMatchObject({ assigned: 1, fixes: 1, rejections: 0, resolutions: 1, unconfirmed: 0, avgDaysToFix: 2 });
  });

  it("a Rejection is counted, and the second Fix is the one timed", async () => {
    const n = await report("omar");
    await assignAndFix(n);
    signInAs("omar@gmail.com");
    ok(await reject(json({ comment: "Still a hole" }), id(n)));
    advanceClock(86_400_000);
    signInAs("crew@gov.pk");
    const f = new FormData();
    f.set("afterImage", new File([new Uint8Array([7])], "again.jpg", { type: "image/jpeg" }));
    ok(await fix(new Request("http://test/x", { method: "POST", body: f }), id(n)));
    signInAs("omar@gmail.com");
    ok(await confirm(json({}), id(n)));

    const r = roadsRecord(await realStats());
    expect(r).toMatchObject({ assigned: 2, fixes: 3, rejections: 1, resolutions: 2 });
    expect(r.avgDaysToFix).toBe(2.5); // 2 days for the first Issue, 3 for this one
  });

  it("an Unconfirmed closure is counted apart and never as a Resolution", async () => {
    const before = await realStats();
    const n = await report("zara");
    await assignAndFix(n);
    advanceClock(7 * 86_400_000 + 60_000);
    const after = await realStats();
    expect(f7(after).unconfirmed).toBe(f7(before).unconfirmed + 1);
    expect(f7(after).resolved).toBe(f7(before).resolved);
    expect(f7(after).open).toBe(f7(before).open);
    expect(after.overview.unconfirmed).toBe(before.overview.unconfirmed + 1);
    expect(after.overview.resolved).toBe(before.overview.resolved);
    expect(roadsRecord(after)).toMatchObject({ unconfirmed: 1, resolutions: 2 });
    expect(f7(after).resolutionRate).toBeCloseTo(2 / 3, 2);
  });

  it("a Business that takes over a revoked one's job does not inherit its Fixes and Rejections", async () => {
    signInAs("official@gov.pk");
    const { departments } = await (await listOffices()).json();
    const departmentId = departments.find((d: { name: string }) => d.name === "Roads").id;
    const office = async (name: string, email: string) => {
      const n = (await (await addOffice(json({ name, departmentId, sector: "F-7", lat: F7.lat, lng: F7.lng }))).json()).id as number;
      await addStaff(json({ email }), id(n));
      return n;
    };
    const first = await office("First Roads", "first@gov.pk");
    const second = await office("Second Roads", "second@gov.pk");
    const work = async (n: number, officeId: number, email: string) => {
      signInAs("official@gov.pk");
      ok(await assign(n, officeId));
      signInAs(email);
      advanceClock(86_400_000);
      ok(await start(json({}), id(n)));
      const f = new FormData();
      f.set("afterImage", new File([new Uint8Array([4, 5, 6])], "after.jpg", { type: "image/jpeg" }));
      ok(await fix(new Request("http://test/x", { method: "POST", body: f }), id(n)));
    };
    const n = await report("takeover");
    await work(n, first, "first@gov.pk");
    signInAs(SUPER_ADMIN);
    ok(await revokeBusiness(new Request("http://test/x", { method: "DELETE" }), id(first)));
    signInAs("takeover@gmail.com");
    ok(await reject(json({ comment: "Still a hole" }), id(n)));
    const recordOf = (s: Stats, o: number) => s.offices.find((x) => x.officeId === o);
    // While nobody holds the Issue, its Fix and Rejection stay on the record of the Business that made the Fix.
    expect(recordOf(await realStats(), first)).toMatchObject({ assigned: 0, fixes: 1, rejections: 1, avgDaysToFix: 1 });

    await work(n, second, "second@gov.pk");
    const s = await realStats();
    expect(recordOf(s, first)).toMatchObject({ assigned: 0, fixes: 1, rejections: 1, avgDaysToFix: 1 });
    expect(recordOf(s, second)).toMatchObject({ assigned: 1, fixes: 1, rejections: 0, avgDaysToFix: 1 });

    // The Super Admin's list says the same about every Business.
    signInAs(SUPER_ADMIN);
    const { businesses: list } = await read(await businesses());
    const fixesOf = (o: number) => list.find((b: { id: number }) => b.id === o).fixes;
    for (const o of [first, second, roads]) expect(fixesOf(o)).toBe(recordOf(s, o)!.fixes);
  });
});

describe("The Demo seed tells the workflow story", () => {
  it("has Offices with Fixes, Rejections and Unconfirmed closures, and keeps closures out of Resolutions", async () => {
    signInDemo("superAdmin");
    const s: Stats = await read(await stats());
    const sum = (k: keyof Office) => s.offices.reduce((a, o) => a + Number(o[k] ?? 0), 0);
    expect(s.offices.length).toBeGreaterThan(3);
    expect(sum("fixes")).toBeGreaterThan(sum("resolutions"));
    expect(sum("rejections")).toBeGreaterThan(0);
    expect(sum("unconfirmed")).toBeGreaterThan(0);
    expect(s.offices.some((o) => o.avgDaysToFix !== null)).toBe(true);
    expect(s.overview.unconfirmed).toBe(sum("unconfirmed"));
    expect(s.overview.resolved).toBe(sum("resolutions"));
    for (const h of s.neighborhoods) expect(h.open + h.resolved + h.unconfirmed).toBe(h.total);
  });

  it("puts a Closed unconfirmed Issue's Fix on its public page", async () => {
    setSession(null);
    const { issues } = await read(await listIssues(new Request("http://test/api/issues")));
    const closed = issues.find((i: { status: string }) => i.status === "closed_unconfirmed");
    expect(closed).toBeTruthy();
    const { issue, events } = await read(await getIssue(new Request("http://test/x"), id(closed.id)));
    expect(issue.fix_note).toBeTruthy(); // the after-photo comes from the photo set, which tests seed without
    expect(issue.fixed_at < issue.closed_at).toBe(true);
    expect(events.map((e: { kind: string }) => e.kind)).toEqual(expect.arrayContaining(["assigned", "fixed", "closed_unconfirmed"]));
  });
});

describe("Reporter names are public, contact details are for officials", () => {
  const names = ["Name-hina", "Name-omar"];
  const contacts = ["hina@gmail.com", "omar@gmail.com", "0300 7654321", "+923007654321"];
  const leaks = (body: string, secrets: string[]) => secrets.filter((s) => body.includes(s));

  it("visitors and Citizens see names but no email or phone", async () => {
    const demoMode = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "false"; // signed-out visitors see real data only when Demo mode is off
    for (const viewer of [() => setSession(null), () => signInAs("watcher@gmail.com")]) {
      viewer();
      const map = JSON.stringify(await read(await listIssues(new Request("http://test/api/issues"))));
      expect(leaks(map, contacts)).toEqual([]);
      const ids: number[] = JSON.parse(map).issues.map((i: { id: number }) => i.id);
      expect(ids.length).toBeGreaterThan(0);
      const pages: string[] = [];
      for (const n of ids) pages.push(JSON.stringify(await read(await getIssue(new Request("http://test/x"), id(n)))));
      expect([401, 403]).toContain((await stats()).status); // Insights are for officials
      pages.push(JSON.stringify(await read(await city())));
      expect(leaks(pages.join(), contacts)).toEqual([]);
      expect(leaks(pages.join(), names)).toEqual(names);
    }
    process.env.DEMO_MODE = demoMode;
  });

  it("the list of Citizens who report most has no scores and no ids", async () => {
    const s = await realStats();
    expect(s.leaderboard.length).toBeGreaterThan(0);
    for (const row of s.leaderboard) {
      expect(row).not.toHaveProperty("score");
      expect(row).not.toHaveProperty("reporter_id");
    }
  });

  it("an Authority still sees the reporter on the Issue page", async () => {
    signInAs("watcher@gmail.com");
    const { issues } = await read(await listIssues(new Request("http://test/api/issues")));
    signInAs("official@gov.pk");
    const all = await Promise.all(
      issues.map(async (i: { id: number }) => JSON.stringify(await read(await getIssue(new Request("http://test/x"), id(i.id))))),
    );
    expect(all.join(" ")).toContain("hina@gmail.com");
  });
});
