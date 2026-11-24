import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as joinInfo, POST as askToJoin } from "../app/api/join-office/route";
import { PUT as saveProfile } from "../app/api/me/profile/route";
import { GET as jobs } from "../app/api/office/jobs/route";
import { GET as listOffices, POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { GET as listRequests } from "../app/api/offices/requests/route";
import { POST as decide } from "../app/api/offices/requests/[id]/route";
import { setSession } from "../lib/session";
import { ctx, signInAs, signInDemo, startTestApp } from "./helpers";

/**
 * Office staff sign-up: a signed-in person asks to join an Office, an Authority of the same world approves or
 * declines, and approval turns the account into that Office's staff on the next request.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;
let parks: number;

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const id = (n: number) => ctx({ id: String(n) });
const authority = () => signInAs("official@gov.pk");
const errorOf = async (res: Response) => ({ status: res.status, error: (await res.json()).error });

async function newOffice(name: string) {
  authority();
  const { departments } = await (await listOffices()).json();
  const departmentId = departments.find((d: { name: string }) => d.name === "Roads").id;
  return (await (await addOffice(json({ name, departmentId, sector: "F-7", lat: 33.72, lng: 73.05 }))).json()).id as number;
}
async function citizen(email: string) {
  signInAs(email);
  await saveProfile(json({ displayName: email.split("@")[0], phone: "0300 1234567" }, "PUT"));
}
async function pendingFor(email: string) {
  authority();
  const { requests } = await (await listRequests()).json();
  return requests.find((r: { email: string; decision: string }) => r.email === email && r.decision === "pending");
}

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    "INSERT INTO access_requests (name, official_email, decision, is_demo) VALUES ('Ayesha', 'official@gov.pk', 'approved', false)",
  );
  roads = await newOffice("F-7 Roads Office");
  parks = await newOffice("G-9 Roads Office");
});
afterAll(() => app.stop());
beforeEach(() => {
  setSession(null);
  app.mail.sent.length = 0;
});

describe("asking to join an Office", () => {
  it("needs a signed-in account", async () => {
    expect(await errorOf(await joinInfo())).toEqual({ status: 401, error: "unauthenticated" });
    expect(await errorOf(await askToJoin(json({ officeId: roads })))).toEqual({ status: 401, error: "unauthenticated" });
  });

  it("shows the Offices of the person's own world and records one waiting request", async () => {
    await citizen("crew.new@gmail.com");
    const info = await (await joinInfo()).json();
    expect(info.offices.map((o: { name: string }) => o.name)).toEqual(expect.arrayContaining(["F-7 Roads Office", "G-9 Roads Office"]));
    expect(info.request).toBeNull();

    const res = await askToJoin(json({ officeId: roads, name: "Bilal Crew", phone: "0300 7654321" }));
    expect(res.status).toBe(201);
    expect((await (await joinInfo()).json()).request).toMatchObject({ office: "F-7 Roads Office", decision: "pending" });
    expect(await errorOf(await askToJoin(json({ officeId: parks, name: "Bilal Crew", phone: "0300 7654321" })))).toEqual({
      status: 409,
      error: "already_requested",
    });
  });

  it("checks the Office, name and phone", async () => {
    await citizen("checks@gmail.com");
    expect(await errorOf(await askToJoin(json({ officeId: 999999, name: "Sana", phone: "0300 1112223" })))).toEqual({ status: 400, error: "invalid_office" });
    expect(await errorOf(await askToJoin(json({ officeId: roads, name: "S", phone: "0300 1112223" })))).toEqual({ status: 400, error: "invalid_name" });
    expect(await errorOf(await askToJoin(json({ officeId: roads, name: "Sana", phone: "123" })))).toEqual({ status: 400, error: "invalid_phone" });
  });

  it("refuses an account that already has an official role", async () => {
    authority();
    expect(await errorOf(await askToJoin(json({ officeId: roads, name: "Ayesha", phone: "0300 1112223" })))).toEqual({
      status: 409,
      error: "already_official",
    });
  });

  it("keeps Demo requests out of the real world", async () => {
    signInDemo("citizen");
    const demoInfo = await (await joinInfo()).json();
    expect(demoInfo.offices.some((o: { name: string }) => o.name === "F-7 Roads Office")).toBe(false);
    // A real Office id cannot be joined from the Demo world.
    expect(await errorOf(await askToJoin(json({ officeId: roads, name: "Demo Citizen", phone: "0300 0000001" })))).toEqual({
      status: 400,
      error: "invalid_office",
    });
  });
});

describe("an Authority deciding", () => {
  it("only Authorities see and decide requests", async () => {
    await citizen("nosy@gmail.com");
    expect(await errorOf(await listRequests())).toEqual({ status: 403, error: "forbidden" });
    expect(await errorOf(await decide(json({ decision: "approved" }), id(1)))).toEqual({ status: 403, error: "forbidden" });
  });

  it("approving makes the person that Office's staff on their next request, and emails them", async () => {
    const req = await pendingFor("crew.new@gmail.com");
    expect(req).toMatchObject({ name: "Bilal Crew", phone: "+92 300 7654321", office: "F-7 Roads Office" });
    const res = await decide(json({ decision: "approved" }), id(req.id));
    expect(await res.json()).toEqual({ ok: true, decision: "approved" });
    expect(app.mail.sent).toHaveLength(1);
    expect(app.mail.sent[0]).toMatchObject({ to: ["crew.new@gmail.com"], subject: "You are now staff of F-7 Roads Office" });

    signInAs("crew.new@gmail.com");
    expect((await jobs()).status).toBe(200);
    expect((await (await joinInfo()).json()).role).toBe("office");

    authority();
    expect(await errorOf(await decide(json({ decision: "declined" }), id(req.id)))).toEqual({ status: 409, error: "conflict" });
  });

  it("declining leaves the account a Citizen, who may ask again", async () => {
    await citizen("maybe@gmail.com");
    await askToJoin(json({ officeId: parks, name: "Maybe", phone: "0300 2223334" }));
    const req = await pendingFor("maybe@gmail.com");
    expect((await decide(json({ decision: "declined" }), id(req.id))).status).toBe(200);

    signInAs("maybe@gmail.com");
    const info = await (await joinInfo()).json();
    expect(info.role).toBe("citizen");
    expect(info.request).toMatchObject({ decision: "declined" });
    expect((await askToJoin(json({ officeId: roads, name: "Maybe", phone: "0300 2223334" }))).status).toBe(201);
  });

  it("refuses to approve an email that already staffs another Office", async () => {
    await citizen("twice@gmail.com");
    await askToJoin(json({ officeId: parks, name: "Twice", phone: "0300 3334445" }));
    authority();
    await addStaff(json({ email: "twice@gmail.com" }), id(roads));
    const req = await pendingFor("twice@gmail.com");
    expect(await errorOf(await decide(json({ decision: "approved" }), id(req.id)))).toEqual({ status: 409, error: "email_taken" });
  });

  it("checks the decision and the request id", async () => {
    authority();
    expect(await errorOf(await decide(json({ decision: "maybe" }), id(1)))).toEqual({ status: 400, error: "bad_request" });
    expect(await errorOf(await decide(json({ decision: "approved" }), id(987654)))).toEqual({ status: 404, error: "not_found" });
  });
});
