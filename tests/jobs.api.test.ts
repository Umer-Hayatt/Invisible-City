import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as readChat, POST as writeChat } from "../app/api/issues/[id]/chat/route";
import { GET as listRequests } from "../app/api/job-requests/route";
import { DELETE as declineRequest } from "../app/api/job-requests/[id]/route";
import { GET as myOffice, PUT as updateOffice } from "../app/api/office/route";
import { GET as available } from "../app/api/office/available/route";
import { POST as askFor } from "../app/api/office/available/[id]/route";
import { POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { setSession } from "../lib/session";
import { assign, ctx, signInAs, startTestApp } from "./helpers";

/**
 * Part 2 of the Business plan: a Business sees the Open Issues of its Department in its sector, asks for one, talks it
 * over with the area's Authority in a chat, and either side can call the other.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roadsF7: number;
let roadsG9: number;
let potholeF7: number;
let potholeG9: number;
let garbageF7: number;

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const get = (url = "http://test/x") => new Request(url);
const id = (n: number) => ctx({ id: String(n) });

async function issue(category: string, neighborhood: string) {
  const [row] = await app.sql.query<{ id: number }>(
    `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, created_at, updated_at)
     VALUES ($1, 'medium', $2, 'x.', 33.7, 73.05, $3, 'open', 1, false, 1, now(), now()) RETURNING id`,
    [category, `${category} in ${neighborhood}`, neighborhood],
  );
  return row.id;
}

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, phone, decision, decided_at, is_demo, area) VALUES
       ('F-7 Authority', 'f7@gov.pk', '+92 300 7777777', 'approved', now(), false, 'F-7'),
       ('G-9 Authority', 'g9@gov.pk', '+92 300 9999999', 'approved', now(), false, 'G-9')`,
  );
  const [{ id: roads }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
  signInAs("f7@gov.pk");
  roadsF7 = (await (await addOffice(json({ name: "F-7 Road Co", departmentId: roads, sector: "F-7", lat: 33.72, lng: 73.05 }))).json()).id;
  await addStaff(json({ email: "f7roads@biz.pk" }), id(roadsF7));
  signInAs("g9@gov.pk");
  roadsG9 = (await (await addOffice(json({ name: "G-9 Road Co", departmentId: roads, sector: "G-9", lat: 33.69, lng: 73.03 }))).json()).id;
  await addStaff(json({ email: "g9roads@biz.pk" }), id(roadsG9));
  potholeF7 = await issue("road_damage", "F-7");
  potholeG9 = await issue("road_damage", "G-9");
  garbageF7 = await issue("garbage", "F-7");
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

describe("available jobs", () => {
  it("shows a Business only Open Issues of its Department in its sector", async () => {
    signInAs("f7roads@biz.pk");
    const ids = (await (await available()).json()).jobs.map((j: { id: number }) => j.id);
    expect(ids).toContain(potholeF7);
    expect(ids).not.toContain(potholeG9);
    expect(ids).not.toContain(garbageF7);
  });

  it("lets it ask for one once, with a note, and refuses jobs outside its scope", async () => {
    signInAs("f7roads@biz.pk");
    app.mail.sent.length = 0;
    expect((await askFor(json({ note: "We can start tomorrow" }), id(potholeF7))).status).toBe(201);
    expect(app.mail.sent.at(-1)?.to).toEqual(["f7@gov.pk"]);
    expect((await askFor(json({}), id(potholeF7))).status).toBe(409);
    expect((await askFor(json({}), id(potholeG9))).status).toBe(404);
    expect((await askFor(json({}), id(garbageF7))).status).toBe(404);
    const job = (await (await available()).json()).jobs.find((j: { id: number }) => j.id === potholeF7);
    expect(job.request).toBe("pending");
  });
});

describe("Job requests for the Authority", () => {
  it("are shown to the Authority of that area only, with the Business's details", async () => {
    signInAs("g9@gov.pk");
    expect((await (await listRequests()).json()).requests.some((r: { issue_id: number }) => r.issue_id === potholeF7)).toBe(false);
    signInAs("f7@gov.pk");
    const r = (await (await listRequests()).json()).requests.find((x: { issue_id: number }) => x.issue_id === potholeF7);
    expect(r).toMatchObject({ office: "F-7 Road Co", email: "f7roads@biz.pk", note: "We can start tomorrow", status: "pending" });
  });

  it("can be declined, and the Business may ask again", async () => {
    signInAs("f7@gov.pk");
    const r = (await (await listRequests()).json()).requests.find((x: { issue_id: number }) => x.issue_id === potholeF7);
    signInAs("g9@gov.pk");
    expect((await declineRequest(get(), id(r.id))).status).toBe(404);
    signInAs("f7@gov.pk");
    expect((await declineRequest(get(), id(r.id))).status).toBe(200);
    signInAs("f7roads@biz.pk");
    expect((await askFor(json({ note: "Second try" }), id(potholeF7))).status).toBe(201);
  });

  it("are settled when the contract is accepted: the chosen Business's request is accepted", async () => {
    signInAs("f7@gov.pk");
    expect((await assign(potholeF7, roadsF7)).status).toBe(200);
    const mine = (await (await listRequests()).json()).requests.filter((x: { issue_id: number }) => x.issue_id === potholeF7);
    expect(mine.map((x: { status: string }) => x.status).sort()).toEqual(["accepted", "declined"]);
    signInAs("f7roads@biz.pk");
    expect((await (await available()).json()).jobs.some((j: { id: number }) => j.id === potholeF7)).toBe(false);
  });
});

describe("chat and calls", () => {
  it("lets the Business and the area's Authority talk about the job, and shows each other's phone", async () => {
    signInAs("f7roads@biz.pk");
    expect((await updateOffice(json({ phone: "0300 5555555" }, "PUT"))).status).toBe(200);
    expect((await (await myOffice()).json()).office.phone).toBe("+92 300 5555555");
    expect((await writeChat(json({ body: "When can we start?" }), id(potholeF7))).status).toBe(201);
    const biz = await (await readChat(get(), id(potholeF7))).json();
    expect(biz.contacts).toEqual([expect.objectContaining({ name: "F-7 Authority", phone: "+92 300 7777777" })]);

    signInAs("f7@gov.pk");
    const url = `http://test/x?office=${roadsF7}`;
    expect((await writeChat(new Request(url, { method: "POST", body: JSON.stringify({ body: "Tomorrow at 9" }) }), id(potholeF7))).status).toBe(201);
    const auth = await (await readChat(get(url), id(potholeF7))).json();
    expect(auth.messages.map((m: { sender_role: string; body: string }) => [m.sender_role, m.body])).toEqual([
      ["office", "When can we start?"],
      ["authority", "Tomorrow at 9"],
    ]);
    expect(auth.contacts).toEqual([expect.objectContaining({ name: "F-7 Road Co", phone: "+92 300 5555555", email: "f7roads@biz.pk" })]);
  });

  it("keeps the chat to the people of that job", async () => {
    // Another area's Authority, another sector's Business, and a Citizen cannot read it.
    signInAs("g9@gov.pk");
    expect((await readChat(get(`http://test/x?office=${roadsF7}`), id(potholeF7))).status).toBe(404);
    signInAs("g9roads@biz.pk");
    expect((await readChat(get(), id(potholeF7))).status).toBe(404);
    signInAs("someone@gmail.com");
    expect((await readChat(get(`http://test/x?office=${roadsF7}`), id(potholeF7))).status).toBe(403);
    signInAs("f7roads@biz.pk");
    expect((await writeChat(json({ body: "" }), id(potholeF7))).status).toBe(400);
  });
});
