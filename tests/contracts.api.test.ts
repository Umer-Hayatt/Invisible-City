import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DELETE as withdraw, POST as answer } from "../app/api/contracts/[id]/route";
import { GET as listContracts } from "../app/api/contracts/route";
import { GET as readChat } from "../app/api/issues/[id]/chat/route";
import { POST as flagSpam } from "../app/api/issues/[id]/reports/[reportId]/spam/route";
import { GET as getIssue } from "../app/api/issues/[id]/route";
import { POST as sendBack } from "../app/api/issues/[id]/send-back/route";
import { GET as listRequests } from "../app/api/job-requests/route";
import { DELETE as declineRequest } from "../app/api/job-requests/[id]/route";
import { GET as available } from "../app/api/office/available/route";
import { POST as askFor } from "../app/api/office/available/[id]/route";
import { GET as jobs } from "../app/api/office/jobs/route";
import { POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { DELETE as revokeBusiness } from "../app/api/super-admin/businesses/[id]/route";
import { setClock } from "../lib/clock";
import { setSession } from "../lib/session";
import { setSql } from "../lib/sql";
import { ctx, NOW, offer, SUPER_ADMIN, signInAs, signInDemo, startTestApp } from "./helpers";

/** An Authority never assigns a job on its own: it sends a contract, and the Issue is Assigned when the Business accepts. */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;
let roadsG9: number;
let noEmail: number;

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const get = (url = "http://test/x") => new Request(url);
const id = (n: number) => ctx({ id: String(n) });
const authority = () => signInAs("f7@gov.pk");
const business = () => signInAs("f7roads@biz.pk");
const errorOf = async (res: Response) => ({ status: res.status, error: (await res.json()).error });

async function pothole() {
  const [row] = await app.sql.query<{ id: number }>(
    `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, created_at, updated_at)
     VALUES ('road_damage', 'medium', 'Pothole', 'x.', 33.72, 73.05, 'F-7', 'open', 1, false, 1, now(), now()) RETURNING id`,
  );
  return row.id;
}
/** A fresh Open Issue with a contract waiting on an Office. */
async function offered(office = roads) {
  const issueId = await pothole();
  authority();
  const res = await offer(issueId, office);
  expect(res.status).toBe(201);
  return { issueId, contractId: (await res.json()).id as number };
}
const reply = (contractId: number, decision: string, reason?: string) => answer(json({ decision, reason }), id(contractId));
const row = async (n: number) =>
  (await app.sql.query<{ status: string; office_id: number | null }>("SELECT status, office_id FROM issues WHERE id = $1", [n]))[0];
const contractsSeen = async (url?: string) =>
  (await (await listContracts(get(url))).json()).contracts as { id: number; status: string; [k: string]: unknown }[];

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, phone, decision, decided_at, is_demo, area) VALUES
       ('F-7 Authority', 'f7@gov.pk', '+92 300 7777777', 'approved', now(), false, 'F-7'),
       ('G-9 Authority', 'g9@gov.pk', '+92 300 9999999', 'approved', now(), false, 'G-9')`,
  );
  const [{ id: dept }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
  const office = async (name: string, sector: string, email?: string) => {
    const n = (await (await addOffice(json({ name, departmentId: dept, sector, lat: 33.72, lng: 73.05 }))).json()).id as number;
    if (email) await addStaff(json({ email }), id(n));
    return n;
  };
  authority();
  roads = await office("F-7 Road Co", "F-7", "f7roads@biz.pk");
  noEmail = await office("No Email Roads", "F-7");
  signInAs("g9@gov.pk");
  roadsG9 = await office("G-9 Road Co", "G-9", "g9roads@biz.pk");
});
afterAll(() => app.stop());
beforeEach(() => {
  setSession(null);
  setClock(NOW);
  app.mail.sent.length = 0;
});

describe("sending a contract", () => {
  it("leaves the Issue Open, emails the Business the terms, and is not yet its job", async () => {
    const { issueId } = await offered();
    expect(await row(issueId)).toEqual({ status: "open", office_id: null });
    expect(app.mail.sent).toHaveLength(1);
    expect(app.mail.sent[0].to).toEqual(["f7roads@biz.pk"]);
    expect(app.mail.sent[0].body).toContain("PKR 50,000");
    business();
    expect((await (await jobs()).json()).jobs.some((j: { id: number }) => j.id === issueId)).toBe(false);
    expect((await (await available()).json()).jobs.find((j: { id: number }) => j.id === issueId).contract).toBe(true);
    // The public timeline says nothing until the Business agrees.
    expect((await (await getIssue(get(), id(issueId))).json()).events).toEqual([]);
  });

  it("does not show reporter contact details to a Business that has not accepted", async () => {
    const { issueId } = await offered();
    await app.sql.query(
      `INSERT INTO reports (issue_id, reporter_id, lat, lng, ai_category, ai_severity, ai_confidence, ai_summary, ai_source, created_at)
       SELECT $1, id, 33.72, 73.05, 'road_damage', 'medium', 0.9, 'x.', 'seed', now() FROM people LIMIT 1`,
      [issueId],
    );
    business();
    expect((await (await getIssue(get(), id(issueId))).json()).reports[0]).not.toHaveProperty("reporter_phone");
  });

  it("allows one waiting contract per Issue, on an Open Issue only", async () => {
    const { issueId, contractId } = await offered();
    expect(await errorOf(await offer(issueId, roadsG9))).toEqual({ status: 409, error: "contract_waiting" });
    business();
    expect((await reply(contractId, "accepted")).status).toBe(200);
    authority();
    expect(await errorOf(await offer(issueId, roadsG9))).toEqual({ status: 409, error: "conflict" });
  });

  it("refuses bad terms, a Business nobody can sign in as, and another area's Authority", async () => {
    const issueId = await pothole();
    authority();
    const bad: [Record<string, unknown>, string][] = [
      [{ scope: " " }, "invalid_scope"],
      [{ pricePkr: -1 }, "invalid_price"],
      [{ pricePkr: "lots" }, "invalid_price"],
      [{ finishDate: "" }, "invalid_dates"],
      [{ finishDate: "2026-02-31" }, "invalid_dates"],
      [{ finishDate: "2026-11-21" }, "invalid_dates"], // yesterday
      [{ startDate: "2030-02-01" }, "invalid_dates"], // after the finish
      [{ paymentTerms: "x".repeat(501) }, "invalid_payment_terms"],
    ];
    for (const [terms, error] of bad) expect(await errorOf(await offer(issueId, roads, terms))).toEqual({ status: 400, error });
    expect(await errorOf(await offer(issueId, noEmail))).toEqual({ status: 400, error: "no_business_email" });
    signInAs("g9@gov.pk");
    expect(await errorOf(await offer(issueId, roadsG9))).toEqual({ status: 403, error: "out_of_area" });
    authority();
    expect((await offer(issueId, roads, { pricePkr: "", startDate: "2026-11-23", finishDate: "2026-11-23" })).status).toBe(201);
    const [c] = await contractsSeen(`http://test/x?issue=${issueId}`);
    expect(c).toMatchObject({ price_pkr: null, start_date: "2026-11-23", finish_date: "2026-11-23", office: "F-7 Road Co", can_answer: true });
  });
});

describe("the Business's answer", () => {
  it("accepting assigns the Issue, tells the Authority, and cannot be done twice", async () => {
    const { issueId, contractId } = await offered();
    app.mail.sent.length = 0;
    business();
    expect((await reply(contractId, "accepted")).status).toBe(200);
    expect(await row(issueId)).toEqual({ status: "assigned", office_id: roads });
    expect(app.mail.sent.map((m) => m.to)).toEqual([["f7@gov.pk"]]);
    expect((await (await getIssue(get(), id(issueId))).json()).events.at(-1)).toMatchObject({ kind: "assigned", message: "Assigned to F-7 Road Co" });
    expect((await reply(contractId, "accepted")).status).toBe(409);
    expect((await reply(contractId, "declined", "Too late")).status).toBe(409);
    authority();
    expect((await withdraw(get(), id(contractId))).status).toBe(409);
  });

  it("declining needs a reason, leaves the Issue Open, and the Authority may offer new terms", async () => {
    const { issueId, contractId } = await offered();
    app.mail.sent.length = 0;
    business();
    expect(await errorOf(await reply(contractId, "declined", " "))).toEqual({ status: 400, error: "invalid_decline_reason" });
    expect(await errorOf(await reply(contractId, "maybe"))).toEqual({ status: 400, error: "invalid_answer" });
    expect((await reply(contractId, "declined", "The price is too low")).status).toBe(200);
    expect(await row(issueId)).toEqual({ status: "open", office_id: null });
    expect(app.mail.sent[0].to).toEqual(["f7@gov.pk"]);
    expect(app.mail.sent[0].body).toContain("The price is too low");
    authority();
    const [c] = await contractsSeen(`http://test/x?issue=${issueId}`);
    expect(c).toMatchObject({ status: "declined", decline_reason: "The price is too low" });
    expect((await offer(issueId, roads, { pricePkr: 90_000 })).status).toBe(201);
  });

  it("belongs to that Business only, in its own world", async () => {
    const { issueId, contractId } = await offered();
    signInAs("g9roads@biz.pk");
    expect((await reply(contractId, "accepted")).status).toBe(404);
    expect((await contractsSeen()).some((c) => c.id === contractId)).toBe(false);
    signInDemo("office");
    expect((await reply(contractId, "accepted")).status).toBe(404);
    expect(await row(issueId)).toEqual({ status: "open", office_id: null });
    signInAs("g9@gov.pk");
    expect((await contractsSeen()).some((c) => c.id === contractId)).toBe(false);
    expect((await withdraw(get(), id(contractId))).status).toBe(404);
  });

  it("is too late once the Issue was removed or the contract withdrawn", async () => {
    const one = await offered();
    await app.sql.query("UPDATE issues SET deleted_at = now() WHERE id = $1", [one.issueId]);
    business();
    expect((await reply(one.contractId, "accepted")).status).toBe(404);

    const two = await offered();
    app.mail.sent.length = 0;
    expect((await withdraw(get(), id(two.contractId))).status).toBe(200);
    expect(app.mail.sent.map((m) => m.to)).toEqual([["f7roads@biz.pk"]]);
    business();
    expect((await reply(two.contractId, "accepted")).status).toBe(409);
    authority();
    expect((await offer(two.issueId, roadsG9)).status).toBe(201);
  });
});

describe("with Job requests and chat", () => {
  it("a Business that asked still has to accept; its request is settled then, and not declined while it decides", async () => {
    const issueId = await pothole();
    business();
    expect((await askFor(json({}), id(issueId))).status).toBe(201);
    authority();
    const contractId = (await (await offer(issueId, roads)).json()).id;
    const mine = async () =>
      (await (await listRequests()).json()).requests.find((r: { issue_id: number }) => r.issue_id === issueId);
    expect(await mine()).toMatchObject({ status: "pending", contract_office_id: roads });
    expect((await declineRequest(get(), id((await mine()).id))).status).toBe(404);
    business();
    expect((await reply(contractId, "accepted")).status).toBe(200);
    authority();
    expect(await mine()).toMatchObject({ status: "accepted", contract_office_id: null });
  });

  it("lets a Business of another sector talk about a contract it was offered", async () => {
    const { issueId } = await offered(roadsG9);
    signInAs("g9roads@biz.pk");
    expect((await readChat(get(), id(issueId))).status).toBe(200);
  });
});

it("revoking a Business withdraws its waiting contracts, so the Issue can be offered to another", async () => {
  const { issueId, contractId } = await offered(roadsG9);
  signInAs(SUPER_ADMIN);
  expect((await revokeBusiness(new Request("http://test/x", { method: "DELETE" }), id(roadsG9))).status).toBe(200);
  authority();
  expect((await contractsSeen(`http://test/x?issue=${issueId}`))[0]).toMatchObject({ id: contractId, status: "withdrawn" });
  expect((await offer(issueId, roads)).status).toBe(201);
});

it("a Business revoked while its contract was being sent is not offered it", async () => {
  const issueId = await pothole();
  authority();
  // The Revocation lands after the Business was checked and before the contract is written.
  setSql({
    ...app.sql,
    async tx(fn) {
      await app.sql.query("UPDATE offices SET revoked_at = now() WHERE id = $1", [roads]);
      return app.sql.tx(fn);
    },
  });
  try {
    expect(await errorOf(await offer(issueId, roads))).toEqual({ status: 400, error: "invalid_office" });
  } finally {
    setSql(app.sql);
    await app.sql.query("UPDATE offices SET revoked_at = NULL WHERE id = $1", [roads]);
  }
});

describe("when the Issue leaves the Business", () => {
  const statusOf = async (issueId: number) => (await contractsSeen(`http://test/x?issue=${issueId}`)).map((c) => c.status);

  it("a Send back ends the accepted contract, and the next one stands on its own", async () => {
    const { issueId, contractId } = await offered();
    business();
    expect((await reply(contractId, "accepted")).status).toBe(200);
    expect((await sendBack(json({ reason: "Not our area" }), id(issueId))).status).toBe(200);
    const [ended] = await contractsSeen(`http://test/x?issue=${issueId}`);
    expect(ended).toMatchObject({ id: contractId, status: "ended", ended_at: NOW.toISOString() });
    authority();
    const again = (await (await offer(issueId, roads)).json()).id;
    business();
    expect((await reply(again, "accepted")).status).toBe(200);
    expect((await statusOf(issueId)).sort()).toEqual(["accepted", "ended"]);
  });

  it("removing the Issue withdraws the waiting contract and tells the Business", async () => {
    const { issueId, contractId } = await offered();
    const [{ id: reportId }] = await app.sql.query<{ id: number }>(
      `INSERT INTO reports (issue_id, reporter_id, lat, lng, ai_category, ai_severity, ai_confidence, ai_summary, ai_source, created_at)
       SELECT $1, id, 33.72, 73.05, 'road_damage', 'medium', 0.9, 'x.', 'seed', now() FROM people LIMIT 1 RETURNING id`,
      [issueId],
    );
    app.mail.sent.length = 0;
    authority();
    const res = await flagSpam(json({}), ctx({ id: String(issueId), reportId: String(reportId) }));
    expect(await res.json()).toMatchObject({ issueRemoved: true });
    expect(app.mail.sent.map((m) => [m.to, m.subject])).toEqual([[["f7roads@biz.pk"], "Contract withdrawn: Pothole"]]);
    // A removed Issue's contracts are on no screen, so this looks at the record itself.
    const [c] = await app.sql.query("SELECT status FROM contracts WHERE id = $1", [contractId]);
    expect(c).toEqual({ status: "withdrawn" });
  });

  it("revoking the Business ends its accepted contract with the job", async () => {
    const { issueId, contractId } = await offered();
    business();
    expect((await reply(contractId, "accepted")).status).toBe(200);
    signInAs(SUPER_ADMIN);
    expect((await revokeBusiness(new Request("http://test/x", { method: "DELETE" }), id(roads))).status).toBe(200);
    authority();
    expect(await statusOf(issueId)).toEqual(["ended"]);
  });
});
