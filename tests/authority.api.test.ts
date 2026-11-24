import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as suggested } from "../app/api/issues/[id]/offices/route";
import { POST as flag } from "../app/api/issues/[id]/reports/[reportId]/spam/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { GET as listIssues } from "../app/api/issues/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as listOffices, POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { DELETE as removeStaff } from "../app/api/offices/[id]/staff/[staffId]/route";
import { POST as submitReport } from "../app/api/reports/route";
import { setAnalyzer } from "../lib/ai";
import { setClock } from "../lib/clock";
import { setSession } from "../lib/session";
import { AIAnalysis, Severity } from "../lib/types";
import { assign, ctx, NOW, offer, signInAs, signInDemo, startTestApp } from "./helpers";

let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  // A real Authority: an approved Access request for this email.
  await app.sql.query(
    "INSERT INTO access_requests (name, official_email, decision, is_demo) VALUES ('Ayesha', 'official@gov.pk', 'approved', false)",
  );
});
afterAll(() => app.stop());

let severity: Severity;
let category: AIAnalysis["category"];
beforeEach(() => {
  process.env.DEMO_MODE = "true";
  setSession(null);
  setClock(NOW);
  severity = "medium";
  category = "road_damage";
  setAnalyzer(async () => ({
    is_civic_issue: true,
    category,
    severity,
    confidence: 0.9,
    title: "A problem",
    summary: "Something to fix.",
    hazards: [],
    source: "gemini",
  }));
});
afterEach(() => setAnalyzer(null));

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const authority = () => signInAs("official@gov.pk");
async function citizen(name: string) {
  signInAs(`${name}@gmail.com`);
  await saveProfile(json({ displayName: name, phone: "0300 1234567" }, "PUT"));
}
async function report(lat: number, lng: number): Promise<number> {
  const f = new FormData();
  f.set("lat", String(lat));
  f.set("lng", String(lng));
  f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
  const res = await submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
  expect(res.status).toBe(200);
  return (await res.json()).issueId;
}
const issue = async (id: number) => {
  const res = await getIssue(new Request("http://test/x"), ctx({ id: String(id) }));
  return res.status === 200 ? await res.json() : null;
};
async function newOffice(name: string, department: string, lat: number, lng: number) {
  authority();
  const { departments } = await (await listOffices()).json();
  const departmentId = departments.find((d: { name: string }) => d.name === department).id;
  const res = await addOffice(json({ name, departmentId, sector: "F-7", lat, lng }));
  expect(res.status).toBe(201);
  return (await res.json()).id as number;
}
const staff = (officeId: number, email: string) => addStaff(json({ email }), ctx({ id: String(officeId) }));
const flagReport = (issueId: number, reportId: number) =>
  flag(json({}), ctx({ id: String(issueId), reportId: String(reportId) }));

describe("the priority queue", () => {
  it("shows an Authority every Issue in the city, highest priority first, and filters by Category", async () => {
    severity = "low";
    await citizen("q1");
    const low = await report(33.51, 73.01);
    severity = "critical";
    category = "garbage";
    await citizen("q2");
    const high = await report(33.52, 73.02);
    authority();
    const all = (await (await listIssues(new Request("http://test/api/issues"))).json()).issues as { id: number; priority: number }[];
    const ids = all.map((i) => i.id);
    expect(ids).toContain(low);
    expect(ids.indexOf(high)).toBeLessThan(ids.indexOf(low));
    expect(all.map((i) => i.priority)).toEqual([...all.map((i) => i.priority)].sort((a, b) => b - a));
    const onlyGarbage = (await (await listIssues(new Request("http://test/api/issues?category=garbage"))).json()).issues;
    expect(onlyGarbage.map((i: { id: number }) => i.id)).toEqual([high]);
  });
});

describe("reporter contact details", () => {
  it("are shown to an Authority and to staff of the assigned Office, and to nobody else", async () => {
    await citizen("ReporterOne");
    const id = await report(33.61, 73.11);
    const assigned = await newOffice("Roads Office A", "Roads", 33.61, 73.11);
    const other = await newOffice("Roads Office B", "Roads", 33.7, 73.2);
    await staff(assigned, "crew-a@gov.pk");
    await staff(other, "crew-b@gov.pk");
    expect((await assign(id, assigned)).status).toBe(200);

    const contactOf = async () => (await issue(id)).reports[0];
    authority();
    expect(await contactOf()).toMatchObject({ reporter_name: "ReporterOne", reporter_email: "ReporterOne@gmail.com", reporter_phone: expect.any(String) });
    signInAs("crew-a@gov.pk");
    expect(await contactOf()).toMatchObject({ reporter_name: "ReporterOne" });

    // Everyone else sees the display name only.
    for (const who of [() => setSession(null), () => citizen("NosyNeighbour"), () => signInAs("crew-b@gov.pk")]) {
      process.env.DEMO_MODE = "false"; // signed-out visitors see real data only when Demo mode is off
      await who();
      const r = await contactOf();
      expect(r.reporter_name).toBe("ReporterOne");
      expect(r).not.toHaveProperty("reporter_email");
      expect(r).not.toHaveProperty("reporter_phone");
    }
  });
});

describe("Spam flags", () => {
  it("hides a Report and removes an Issue whose only Report was flagged", async () => {
    await citizen("spammer1");
    const id = await report(33.31, 73.31);
    authority();
    const [r] = (await issue(id)).reports;
    const res = await flagReport(id, r.id);
    expect(await res.json()).toMatchObject({ ok: true, issueRemoved: true });
    expect(await issue(id)).toBeNull();
  });

  it("keeps an Issue that still has other Reports, with the count lowered", async () => {
    await citizen("spammer2");
    const id = await report(33.32, 73.32);
    await citizen("honest");
    await report(33.32, 73.32);
    authority();
    const [first] = (await issue(id)).reports;
    expect((await (await flagReport(id, first.id)).json()).issueRemoved).toBe(false);
    const after = await issue(id);
    expect(after.reports).toHaveLength(1);
    expect(after.issue.report_count).toBe(1);
  });

  it("suspends a Citizen at their third flagged Report", async () => {
    await citizen("serial");
    const ids = [await report(33.41, 73.41), await report(33.42, 73.42), await report(33.43, 73.43)];
    authority();
    for (const [n, id] of ids.entries()) {
      const [r] = (await issue(id)).reports;
      expect((await (await flagReport(id, r.id)).json()).suspended).toBe(n === 2);
    }
    await citizen("serial");
    const f = new FormData();
    f.set("lat", "33.5");
    f.set("lng", "73.5");
    f.set("image", new File([new Uint8Array([1])], "p.jpg", { type: "image/jpeg" }));
    const res = await submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("suspended");
  });

  it("is for Authorities only", async () => {
    await citizen("cheeky");
    const id = await report(33.33, 73.33);
    const [r] = (await issue(id)).reports;
    const res = await flagReport(id, r.id);
    expect(res.status).toBe(403);
  });
});

describe("assigning an Issue", () => {
  it("suggests the Offices of the Issue's Department, nearest first, with distance", async () => {
    await citizen("sugg");
    const id = await report(33.8, 73.8);
    const far = await newOffice("Roads Far", "Roads", 33.9, 73.9);
    const near = await newOffice("Roads Near", "Roads", 33.801, 73.801);
    await newOffice("Sanitation Near", "Sanitation", 33.8, 73.8);
    authority();
    const { offices } = await (await suggested(new Request("http://test/x"), ctx({ id: String(id) }))).json();
    expect(offices.slice(0, 2).map((o: { id: number }) => o.id)).toEqual([near, far]);
    expect(offices[0].distance).toBeLessThan(offices[1].distance);
    expect(offices[0].distance).toBeGreaterThan(0);
  });

  it("moves an Open Issue to Assigned once the Office accepts its contract, and refuses a second one", async () => {
    await citizen("assignme");
    const id = await report(33.85, 73.85);
    const office = await newOffice("Roads Assign", "Roads", 33.85, 73.85);
    await staff(office, "Lead@Gov.pk");
    app.mail.sent.length = 0;
    authority();
    expect((await assign(id, office)).status).toBe(200);
    const after = await issue(id);
    expect(after.issue).toMatchObject({ status: "assigned", assigned_team: "Roads Assign" });
    expect(after.events.some((e: { message: string }) => e.message.includes("Assigned to Roads Assign"))).toBe(true);
    // The contract to the Office, then its acceptance to the Authority.
    expect(app.mail.sent.map((m) => m.to)).toEqual([["lead@gov.pk"], ["official@gov.pk"]]);
    const again = await offer(id, office);
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("conflict");
    expect(app.mail.sent).toHaveLength(2);
  });

  it("refuses an Office of another Department", async () => {
    await citizen("wrongdept");
    const id = await report(33.9, 73.95);
    const sanitation = await newOffice("Sanitation Wrong", "Sanitation", 33.9, 73.95);
    authority();
    const res = await offer(id, sanitation);
    expect(res.status).toBe(400);
    expect((await issue(id)).issue.status).toBe("open");
  });

  it("does not email anyone for Demo data", async () => {
    signInDemo("authority");
    const { issues } = await (await listIssues(new Request("http://test/api/issues?status=open"))).json();
    const target = issues[0];
    const { offices } = await (await suggested(new Request("http://test/x"), ctx({ id: String(target.id) }))).json();
    app.mail.sent.length = 0;
    expect((await offer(target.id, offices[0].id)).status).toBe(201);
    expect(app.mail.sent).toHaveLength(0);
  });

  it("is for Authorities only", async () => {
    await citizen("notauth");
    expect((await offer(1, 1)).status).toBe(403);
  });
});

describe("Offices and staff", () => {
  it("gives each Office one email: a new one replaces the old, and an email on another Office is refused", async () => {
    const a = await newOffice("Staff Office A", "Electrical", 33.2, 73.2);
    const b = await newOffice("Staff Office B", "Electrical", 33.3, 73.3);
    authority();
    expect((await staff(a, "Shared@Gov.pk")).status).toBe(201);
    const clash = await staff(b, "shared@gov.pk");
    expect(clash.status).toBe(409);
    expect((await clash.json()).error).toBe("email_taken");
    expect((await staff(a, "not-an-email")).status).toBe(400);
    // Setting a second email replaces the first, then the first again replaces the second.
    expect((await staff(a, "other@gov.pk")).status).toBe(201);
    const replaced = (await (await listOffices()).json()).offices.find((o: { id: number }) => o.id === a);
    expect(replaced.staff.map((s: { email: string }) => s.email)).toEqual(["other@gov.pk"]);
    expect((await staff(a, "shared@gov.pk")).status).toBe(201);

    const listed = (await (await listOffices()).json()).offices.find((o: { id: number }) => o.id === a);
    expect(listed.staff.map((s: { email: string }) => s.email)).toEqual(["shared@gov.pk"]);
    const staffId = listed.staff[0].id;
    expect((await removeStaff(new Request("http://test/x", { method: "DELETE" }), ctx({ id: String(a), staffId: String(staffId) }))).status).toBe(200);
    expect((await staff(b, "shared@gov.pk")).status).toBe(201);
  });

  it("keeps Demo Offices apart from real ones", async () => {
    authority();
    const real = (await (await listOffices()).json()).offices as { name: string }[];
    expect(real.some((o) => o.name.startsWith("Roads Sub-division"))).toBe(false);
    signInDemo("authority");
    const demo = (await (await listOffices()).json()).offices as { name: string }[];
    expect(demo.some((o) => o.name.startsWith("Roads Sub-division"))).toBe(true);
  });

  it("is for Authorities only", async () => {
    await citizen("noOffices");
    expect((await listOffices()).status).toBe(403);
    expect((await addOffice(json({ name: "x" }))).status).toBe(403);
  });
});
