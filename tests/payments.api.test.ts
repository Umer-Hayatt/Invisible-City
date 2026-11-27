import { inflateSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as answer } from "../app/api/contracts/[id]/route";
import { POST as markPaid } from "../app/api/contracts/[id]/paid/route";
import { GET as download } from "../app/api/contracts/[id]/pdf/route";
import { GET as listContracts } from "../app/api/contracts/route";
import { POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { setSession } from "../lib/session";
import { ctx, offer, signInAs, startTestApp } from "./helpers";

/**
 * Contract payments: the price is what was agreed; the Authority of the area records the payment once the Citizen has
 * confirmed the Fix, once, with an optional reference. Both sides see it, the PDF shows it, the Business is emailed.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;

const json = (data: unknown) =>
  new Request("http://test/x", { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const id = (n: number) => ctx({ id: String(n) });
const authority = () => signInAs("f7@gov.pk");
const business = () => signInAs("f7roads@biz.pk");
const pay = (n: number, reference?: string) => markPaid(json({ reference }), id(n));
const errorOf = async (res: Response) => ({ status: res.status, error: (await res.json()).error });
const seen = async (n: number) =>
  ((await (await listContracts(new Request("http://test/x"))).json()).contracts as { id: number; paid_at: string | null; payment_reference: string | null; issue_status: string }[]).find(
    (c) => c.id === n,
  )!;

/**
 * Everything the PDF says, read back from its text operators. Each stream is taken by its declared /Length, so a
 * compressed stream that happens to end in a carriage-return byte is not cut short.
 */
function textOf(bytes: Buffer) {
  const raw = bytes.toString("latin1");
  const out: string[] = [];
  for (const m of raw.matchAll(/\/Length (\d+)[^]*?stream\r?\n/g)) {
    const start = m.index! + m[0].length;
    try {
      out.push(inflateSync(bytes.subarray(start, start + Number(m[1]))).toString("latin1"));
    } catch {
      // not a compressed stream (an image, say)
    }
  }
  return [...out.join("\n").matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((x) => Buffer.from(x[1], "hex").toString("latin1")).join("\n");
}

/** An Open Issue in F-7 with a contract the Business has accepted; returns both ids. */
async function acceptedJob() {
  const [{ id: issueId }] = await app.sql.query<{ id: number }>(
    `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, created_at, updated_at)
     VALUES ('road_damage', 'medium', 'Pothole on Margalla Road', 'x.', 33.72, 73.05, 'F-7', 'open', 1, false, 1, now(), now()) RETURNING id`,
  );
  authority();
  const sent = await offer(issueId, roads, { pricePkr: 45000 });
  expect(sent.status).toBe(201);
  const contractId = (await sent.json()).id as number;
  business();
  expect((await answer(json({ decision: "accepted" }), id(contractId))).status).toBe(200);
  return { issueId, contractId };
}
const confirmFix = (issueId: number) => app.sql.query("UPDATE issues SET status = 'resolved', resolved_at = now() WHERE id = $1", [issueId]);

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, phone, decision, decided_at, is_demo, area) VALUES
       ('F-7 Authority', 'f7@gov.pk', '+92 300 7777777', 'approved', now(), false, 'F-7'),
       ('G-9 Authority', 'g9@gov.pk', '+92 300 9999999', 'approved', now(), false, 'G-9')`,
  );
  const [{ id: dept }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
  authority();
  roads = (await (await addOffice(json({ name: "F-7 Road Co", departmentId: dept, sector: "F-7", lat: 33.72, lng: 73.05 }))).json()).id;
  await addStaff(json({ email: "f7roads@biz.pk" }), id(roads));
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

describe("contract payments", () => {
  it("waits until the Citizen confirms the Fix", async () => {
    const { contractId } = await acceptedJob();
    authority();
    expect(await errorOf(await pay(contractId))).toEqual({ status: 409, error: "not_resolved" });
    const c = await seen(contractId);
    expect(c.paid_at).toBeNull();
  });

  it("is recorded once, by an Authority of the area, with a reference, and the Business is emailed", async () => {
    const { issueId, contractId } = await acceptedJob();
    await confirmFix(issueId);

    signInAs("g9@gov.pk");
    expect((await pay(contractId)).status).toBe(404);
    business();
    expect((await pay(contractId)).status).toBe(403);

    authority();
    app.mail.sent.length = 0;
    expect((await pay(contractId, "Cheque 004512")).status).toBe(200);
    expect(app.mail.sent.map((m) => m.to)).toEqual([["f7roads@biz.pk"]]);
    expect(app.mail.sent[0].body).toContain("PKR 45,000");
    expect(await errorOf(await pay(contractId))).toEqual({ status: 409, error: "conflict" });

    const forAuthority = await seen(contractId);
    expect(forAuthority.paid_at).not.toBeNull();
    expect(forAuthority.payment_reference).toBe("Cheque 004512");
    business();
    expect((await seen(contractId)).paid_at).not.toBeNull();
  });

  it("shows the payment on the contract PDF", async () => {
    const { issueId, contractId } = await acceptedJob();
    business();
    const before = textOf(Buffer.from(await (await download(new Request("http://test/x"), id(contractId))).arrayBuffer()));
    expect(before).toContain("Not paid yet");
    await confirmFix(issueId);
    authority();
    await pay(contractId, "IBFT-88213");
    const after = textOf(Buffer.from(await (await download(new Request("http://test/x"), id(contractId))).arrayBuffer()));
    expect(after).toContain("PKR 45,000");
    expect(after).toMatch(/Paid \d{4}-\d{2}-\d{2}/);
    expect(after).toContain("IBFT-88213");
  });

  it("refuses a reference that is too long", async () => {
    const { issueId, contractId } = await acceptedJob();
    await confirmFix(issueId);
    authority();
    expect(await errorOf(await pay(contractId, "x".repeat(121)))).toEqual({ status: 400, error: "invalid_reference" });
  });
});
