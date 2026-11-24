import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as listIssues } from "../app/api/issues/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { GET as getStats } from "../app/api/stats/route";
import { POST as submitReport } from "../app/api/reports/route";
import { FAKE_PHOTO_URL } from "../lib/photo-store";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { ctx, signInAs, startTestApp } from "./helpers";

let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());

const json = async (r: Response) => r.json();

describe("the public map and Issue pages", () => {
  it("lists the demo Issues, highest priority first", async () => {
    const { issues } = await json(await listIssues(new Request("http://test/api/issues")));
    expect(issues.length).toBe(69);
    const priorities = issues.map((i: { priority: number }) => i.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });

  it("filters Issues by neighbourhood and status", async () => {
    const { issues } = await json(await listIssues(new Request("http://test/api/issues?neighborhood=I-10&status=unresolved")));
    expect(issues.length).toBe(7); // I-10 has 8 Issues and resolves 1
    expect(issues.every((i: { neighborhood: string; status: string }) => i.neighborhood === "I-10" && i.status !== "resolved")).toBe(true);
  });

  it("opens one Issue with its Reports and timeline, with reporter names but no contact details", async () => {
    const { issues } = await json(await listIssues(new Request("http://test/api/issues")));
    const res = await getIssue(new Request("http://test/api/issues/1"), ctx({ id: String(issues[0].id) }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.issue.id).toBe(issues[0].id);
    expect(body.reports.length).toBe(body.issue.report_count);
    expect(body.events.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(/reporter_id|@invisible\.city|\+92/);
    for (const r of body.reports) expect(r.reporter_name).toBeTruthy();
  });

  it("answers 404 for an Issue that does not exist", async () => {
    const res = await getIssue(new Request("http://test/api/issues/99999"), ctx({ id: "99999" }));
    expect(res.status).toBe(404);
  });

  it("keeps the neglect story: I-10, G-11 and I-9 resolve the least, and G-9 has a recurrence", async () => {
    const { neighborhoods, predictive } = await json(await getStats());
    const neglected = neighborhoods.filter((n: { neglected: boolean }) => n.neglected).map((n: { name: string }) => n.name);
    expect(neglected).toEqual(expect.arrayContaining(["I-10", "G-11", "I-9"]));
    expect(predictive.some((p: { neighborhood: string; message: string }) => p.neighborhood === "G-9" && /recurred/.test(p.message))).toBe(true);
  });
});

describe("submitting a Report", () => {
  const report = async (lat: number, lng: number, who: string) => {
    signInAs(who + "@gmail.com");
    await saveProfile(new Request("http://test/api/me/profile", { method: "PUT", body: JSON.stringify({ displayName: "Test " + who, phone: "0300 1234567" }) }));
    const f = new FormData();
    f.set("lat", String(lat));
    f.set("lng", String(lng));
    f.set("description", "Deep pothole in the road, dangerous for bikes");
    f.set("image", new File([new Uint8Array([1, 2, 3])], "p.jpg", { type: "image/jpeg" }));
    return submitReport(new Request("http://test/api/reports", { method: "POST", body: f }));
  };

  it("stores the photo through the Photo store and creates an Issue, then merges a second Report of the same spot", async () => {
    const first = await json(await report(33.7, 73.1, "citizen-a"));
    expect(first.duplicate).toBeNull();
    expect(first.issue.cover_image).toBe(FAKE_PHOTO_URL);
    expect(first.issue.constituency).toBeTruthy();

    const second = await json(await report(33.7001, 73.1001, "citizen-b"));
    expect(second.duplicate?.issueId).toBe(first.issueId);
    const { issue } = await json(await getIssue(new Request("http://test"), ctx({ id: String(first.issueId) })));
    expect(issue.report_count).toBe(2);
  });
});
