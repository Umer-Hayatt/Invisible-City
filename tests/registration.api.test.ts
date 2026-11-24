import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as requestAccess } from "../app/api/access-requests/route";
import { GET as listIssues } from "../app/api/issues/route";
import { GET as myOffice, PUT as setWorkers } from "../app/api/office/route";
import { GET as listOffices } from "../app/api/offices/route";
import { GET as listRegistrations } from "../app/api/offices/registrations/route";
import { POST as decide } from "../app/api/offices/registrations/[id]/route";
import { GET as myRegistration, POST as register } from "../app/api/register-office/route";
import { GET as stats } from "../app/api/stats/route";
import { neighborhoodStats } from "../lib/insights";
import { setSession } from "../lib/session";
import type { Issue } from "../lib/types";
import { ctx, NOW, signInAs, signInDemo, startTestApp, offer } from "./helpers";

/**
 * Fixes of 24 November (backend half): Offices register themselves and an Authority approves; Authorities work for one
 * area or the whole city; Offices record their workers, and spare workers with waiting Issues mark a sector neglected.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roadsId: number;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, decision, decided_at, is_demo, area) VALUES
       ('Whole city', 'city@gov.pk', 'approved', now(), false, NULL),
       ('G-9 only', 'g9@gov.pk', 'approved', now(), false, 'G-9')`,
  );
  [{ id: roadsId }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const form = (over: Record<string, unknown> = {}) => ({
  name: "Khan Road Works",
  departmentId: roadsId,
  sector: "G-9",
  isPrivate: true,
  workers: 5,
  contactName: "Bilal Khan",
  phone: "0300 7654321",
  ...over,
});
const pendingFor = async (email: string) => {
  const { registrations } = await (await listRegistrations()).json();
  return registrations.find((r: { email: string; decision: string }) => r.email === email && r.decision === "pending");
};

describe("Office registration", () => {
  it("files a registration under the signed-in Google email, once at a time", async () => {
    signInAs("firm@gmail.com");
    expect((await register(json(form()))).status).toBe(201);
    const again = await register(json(form()));
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("already_requested");
    const { registration } = await (await myRegistration()).json();
    expect(registration).toMatchObject({ name: "Khan Road Works", sector: "G-9", is_private: true, workers: 5, decision: "pending" });
  });

  it("checks the form", async () => {
    signInAs("bad@gmail.com");
    for (const [over, error] of [
      [{ name: "" }, "invalid_office_name"],
      [{ sector: "Z-99" }, "invalid_sector"],
      [{ workers: -1 }, "invalid_workers"],
      [{ phone: "123" }, "invalid_phone"],
      [{ departmentId: 99999 }, "invalid_department"],
    ] as const) {
      const res = await register(json(form(over)));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(error);
    }
    signInAs(null);
    expect((await register(json(form()))).status).toBe(401);
  });

  it("is decided by an Authority of that area; another area's Authority neither sees nor decides it", async () => {
    signInAs("firm-i8@gmail.com");
    await register(json(form({ name: "I-8 Crew", sector: "I-8" })));
    signInAs("g9@gov.pk");
    expect(await pendingFor("firm-i8@gmail.com")).toBeUndefined();
    signInAs("city@gov.pk");
    const r = await pendingFor("firm-i8@gmail.com");
    expect(r).toBeTruthy();
    signInAs("g9@gov.pk");
    expect((await decide(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(403);
  });

  it("on approval creates the Office with its workers, and the registering email signs in as that Office", async () => {
    signInAs("g9@gov.pk");
    const r = await pendingFor("firm@gmail.com");
    app.mail.sent.length = 0;
    expect((await decide(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(200);
    expect((await decide(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(409);
    expect(app.mail.sent.map((m) => m.to)).toEqual([["firm@gmail.com"]]);

    const { offices } = await (await listOffices()).json();
    const office = offices.find((o: { name: string }) => o.name === "Khan Road Works");
    expect(office).toMatchObject({ sector: "G-9", workers: 5, is_private: true });
    expect(office.staff.map((s: { email: string }) => s.email)).toEqual(["firm@gmail.com"]);

    signInAs("firm@gmail.com");
    const mine = await (await myOffice()).json();
    expect(mine.office).toMatchObject({ name: "Khan Road Works", workers: 5, active: 0 });
    expect((await (await myRegistration()).json()).registration.decision).toBe("approved");
    // Already an Office: it cannot register a second one.
    expect((await register(json(form({ name: "Second" })))).status).toBe(403);
  });

  it("a declined registration creates nothing, and the business may register again", async () => {
    signInAs("nope@gmail.com");
    await register(json(form({ name: "Declined Works" })));
    signInAs("city@gov.pk");
    const r = await pendingFor("nope@gmail.com");
    expect((await decide(json({ decision: "declined" }), ctx({ id: String(r.id) }))).status).toBe(200);
    const [{ n }] = await app.sql.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM offices WHERE name = 'Declined Works'");
    expect(n).toBe(0);
    signInAs("nope@gmail.com");
    expect((await register(json(form({ name: "Declined Works" })))).status).toBe(201);
  });
});

describe("Authority areas", () => {
  it("stores the area on an Access request and refuses an unknown sector", async () => {
    const body = { name: "Sana", department: "Roads", officialEmail: "sana@gov.pk", phone: "0300 1111111" };
    expect((await requestAccess(json({ ...body, area: "Mars" }))).status).toBe(400);
    expect((await requestAccess(json({ ...body, area: "F-7" }))).status).toBe(201);
    const [row] = await app.sql.query<{ area: string }>("SELECT area FROM access_requests WHERE official_email = 'sana@gov.pk'");
    expect(row.area).toBe("F-7");
  });

  it("shows an area Authority only that area's Issues and Offices; a whole-city Authority sees all", async () => {
    await app.sql.query("UPDATE issues SET is_demo = false WHERE id IN (SELECT id FROM issues WHERE is_demo ORDER BY id LIMIT 30)");
    signInAs("g9@gov.pk");
    const area = await (await listIssues(new Request("http://test/api/issues"))).json();
    expect(area.area).toBe("G-9");
    for (const i of area.issues) expect(i.neighborhood).toBe("G-9");
    for (const o of (await (await listOffices()).json()).offices) expect(o.sector).toBe("G-9");

    signInAs("city@gov.pk");
    const city = await (await listIssues(new Request("http://test/api/issues"))).json();
    expect(city.area).toBeNull();
    expect(new Set(city.issues.map((i: Issue) => i.neighborhood)).size).toBeGreaterThan(1);
  });

  it("refuses an area Authority a contract outside the area", async () => {
    const [outside] = await app.sql.query<{ id: number }>(
      "SELECT id FROM issues WHERE NOT is_demo AND status = 'open' AND neighborhood <> 'G-9' AND deleted_at IS NULL LIMIT 1",
    );
    signInAs("g9@gov.pk");
    const res = await offer(outside.id, 1);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("out_of_area");
  });
});

describe("workers and the neglect rule", () => {
  it("lets an Office record its workers and refuses nonsense", async () => {
    signInAs("firm@gmail.com");
    expect((await setWorkers(json({ workers: 8 }, "PUT"))).status).toBe(200);
    expect((await (await myOffice()).json()).office.workers).toBe(8);
    expect((await setWorkers(json({ workers: -3 }, "PUT"))).status).toBe(400);
    expect((await setWorkers(json({ workers: 2.5 }, "PUT"))).status).toBe(400);
    signInAs("city@gov.pk");
    expect((await setWorkers(json({ workers: 1 }, "PUT"))).status).toBe(403);
  });

  it("flags a sector whose Offices have spare workers while Issues wait more than 7 days", () => {
    const old = new Date(NOW.getTime() - 10 * 86_400_000).toISOString();
    const fresh = new Date(NOW.getTime() - 2 * 86_400_000).toISOString();
    const issue = (over: Partial<Issue>) => ({ neighborhood: "F-7", status: "open", severity: "medium", created_at: old, report_count: 1, ...over }) as Issue;
    const f7 = (issues: Issue[], workers: number, active: number) =>
      neighborhoodStats(issues, [{ sector: "F-7", workers, active }]).find((n) => n.name === "F-7")!;

    expect(f7([issue({})], 4, 1)).toMatchObject({ neglected: true, workers: 4, spareWorkers: 3, stale: 1 });
    // Every worker busy: not neglect, the Office is stretched.
    expect(f7([issue({})], 2, 2)).toMatchObject({ neglected: false, spareWorkers: 0 });
    // Nothing has waited a week yet.
    expect(f7([issue({ created_at: fresh })], 4, 0)).toMatchObject({ neglected: false, stale: 0 });
    // No workers recorded: the old resolution-rate test applies, and the worker fields stay empty.
    expect(f7([issue({})], 0, 0)).toMatchObject({ workers: null, spareWorkers: null });
  });

  it("keeps the Demo neglect story on worker evidence", async () => {
    signInDemo("authority");
    const { neighborhoods } = await (await stats()).json();
    for (const name of ["I-10", "G-11", "I-9"]) {
      const h = neighborhoods.find((n: { name: string }) => n.name === name);
      expect(h.neglected).toBe(true);
      expect(h.spareWorkers).toBeGreaterThan(0);
      expect(h.stale).toBeGreaterThan(0);
    }
  });
});
