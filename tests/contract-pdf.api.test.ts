import { deflateSync, inflateSync } from "node:zlib";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as download } from "../app/api/contracts/[id]/pdf/route";
import { POST as answer } from "../app/api/contracts/[id]/route";
import { DELETE as withdraw } from "../app/api/contracts/[id]/route";
import { POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { DEMO_ACCOUNTS } from "../lib/demo-accounts";
import { setMailer } from "../lib/mailer";
import { renderContractPdf, type ContractPdfData } from "../lib/contract-pdf";
import { setClock } from "../lib/clock";
import { setSession } from "../lib/session";
import { ctx, NOW, offer, signInAs, signInDemo, startTestApp } from "./helpers";

let app: Awaited<ReturnType<typeof startTestApp>>;
let roads: number;

const json = (data: unknown, method = "POST") =>
  new Request("http://test/x", { method, body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const id = (n: number) => ctx({ id: String(n) });
const pdf = (n: number) => download(new Request("http://test/x"), id(n));

/** Everything the PDF says, read back from its text operators (the standard font writes each string as hex). */
function textOf(bytes: Buffer) {
  const raw = bytes.toString("latin1");
  const s = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((m) => {
      try {
        return inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
      } catch {
        return "";
      }
    })
    .join("\n");
  return [...s.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((m) => Buffer.from(m[1], "hex").toString("latin1")).join("\n");
}

/** A valid 1x1 PNG. */
function png() {
  const crc = (b: Buffer) => {
    let c = ~0;
    for (const x of b) {
      c ^= x;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const data = (over: Partial<ContractPdfData> = {}): ContractPdfData => ({
  id: 7,
  status: "sent",
  sentAt: "2026-11-22T12:00:00.000Z",
  decidedAt: null,
  decidedBy: null,
  declineReason: null,
  endedAt: null,
  scope: "Repair the road.",
  pricePkr: 50_000,
  startDate: null,
  finishDate: "2030-01-31",
  paymentTerms: null,
  issue: { id: 3, title: "Pothole on Main Road", category: "road_damage", sector: "F-7" },
  authority: { name: "F-7 Authority", area: "F-7", email: "f7@gov.pk", phone: "+92 300 7777777" },
  business: { name: "F-7 Road Co", department: "Roads", sector: "F-7", email: "f7roads@biz.pk", phone: "0300 1234567" },
  siteUrl: "https://invisible.test",
  ...over,
});

async function pothole(title = "Pothole") {
  const [row] = await app.sql.query<{ id: number }>(
    `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, cover_image, created_at, updated_at)
     VALUES ('road_damage', 'medium', $1, 'x.', 33.72, 73.05, 'F-7', 'open', 1, false, 1, 'https://photos.test/fixed.jpg', now(), now()) RETURNING id`,
    [title],
  );
  return row.id;
}
async function offered(title?: string, terms: Record<string, unknown> = {}) {
  const issueId = await pothole(title);
  signInAs("f7@gov.pk");
  const res = await offer(issueId, roads, terms);
  expect(res.status).toBe(201);
  return (await res.json()).id as number;
}

beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, phone, decision, decided_at, is_demo, area) VALUES
       ('F-7 Authority', 'f7@gov.pk', '+92 300 7777777', 'approved', now(), false, 'F-7'),
       ('G-9 Authority', 'g9@gov.pk', '+92 300 9999999', 'approved', now(), false, 'G-9'),
       ('City Authority', 'city@gov.pk', null, 'approved', now(), false, null)`,
  );
  const [{ id: dept }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
  const office = async (name: string, sector: string, email: string) => {
    const n = (await (await addOffice(json({ name, departmentId: dept, sector, lat: 33.72, lng: 73.05 }))).json()).id as number;
    await addStaff(json({ email }), id(n));
    return n;
  };
  signInAs("f7@gov.pk");
  roads = await office("F-7 Road Co", "F-7", "f7roads@biz.pk");
  signInAs("g9@gov.pk");
  await office("G-9 Road Co", "G-9", "g9roads@biz.pk");
});
afterAll(() => app.stop());
beforeEach(() => {
  setSession(null);
  setClock(NOW);
  app.mail.sent.length = 0;
});

describe("the contract PDF", () => {
  it("is a valid A4 PDF with the Issue, the price, both parties and the disclaimer", async () => {
    const bytes = await renderContractPdf(data(), null);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.toString("latin1")).toContain("/MediaBox [ 0 0 595.28 841.89 ]");
    const text = textOf(bytes);
    for (const s of ["Pothole on Main Road", "PKR 50,000", "F-7 Authority", "F-7 Road Co", "Roads", "f7roads@biz.pk", "+92 300 7777777", "Repair the road.", "Contract 7"])
      expect(text).toContain(s);
    expect(text).toContain("This document is not legally binding by itself.");
    expect(text).toMatch(/Signature/);
    expect(text).toContain("https://invisible.test/issues/3");
  });

  it("says the price is to be agreed when there is none, and works without a photo", async () => {
    const text = textOf(await renderContractPdf(data({ pricePkr: null }), null));
    expect(text).toContain("To be agreed");
    expect(text).not.toContain("PKR");
  });

  it("embeds the cover photo when it can be read, and survives bytes that are not an image", async () => {
    const withPhoto = await renderContractPdf(data(), png());
    expect(withPhoto.toString("latin1")).toContain("/Subtype /Image");
    const bad = await renderContractPdf(data(), Buffer.from("not an image"));
    expect(bad.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bad.toString("latin1")).not.toContain("/Subtype /Image");
  });

  it("does not present a declined, withdrawn or ended contract as agreed, and copes with Urdu text", async () => {
    const declined = textOf(await renderContractPdf(data({ status: "declined", decidedAt: "2026-11-23T08:00:00.000Z", decidedBy: "f7roads@biz.pk", declineReason: "Price too low" }), null));
    expect(declined).toContain("Declined");
    expect(declined).toContain("Price too low");
    expect(declined).not.toMatch(/Accepted/);
    expect(textOf(await renderContractPdf(data({ status: "withdrawn", decidedAt: "2026-11-23T08:00:00.000Z" }), null))).toContain("Withdrawn");
    expect(textOf(await renderContractPdf(data({ status: "ended", decidedAt: "2026-11-23T08:00:00.000Z", endedAt: "2026-11-24T08:00:00.000Z" }), null))).toContain("Ended");
    const accepted = textOf(await renderContractPdf(data({ status: "accepted", decidedAt: "2026-11-23T08:00:00.000Z", decidedBy: "f7roads@biz.pk" }), null));
    expect(accepted).toContain("Accepted");
    expect(accepted).toContain("f7roads@biz.pk");
    const urdu = await renderContractPdf(data({ scope: "سڑک کی مرمت\nRepair" }), null);
    expect(urdu.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("GET /api/contracts/[id]/pdf", () => {
  it("lets the Authority of the area and the Business have it, with a PDF content type and file name", async () => {
    const c = await offered("Pothole near the school", { pricePkr: 75_000 });
    for (const who of ["f7@gov.pk", "city@gov.pk", "f7roads@biz.pk"]) {
      signInAs(who);
      const res = await pdf(c);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toContain(`contract-${c}.pdf`);
      const text = textOf(Buffer.from(await res.arrayBuffer()));
      expect(text).toContain("Pothole near the school");
      expect(text).toContain("PKR 75,000");
    }
  });

  it("refuses nobody-signed-in with 401, a Citizen, another area's Authority and another Business with 403 or 404", async () => {
    const c = await offered();
    setSession(null);
    expect((await pdf(c)).status).toBe(401);
    signInAs("someone@example.com");
    expect((await pdf(c)).status).toBe(403);
    signInAs("g9@gov.pk");
    expect((await pdf(c)).status).toBe(404);
    signInAs("g9roads@biz.pk");
    expect((await pdf(c)).status).toBe(404);
    signInAs("f7@gov.pk");
    expect((await pdf(0)).status).toBe(404);
    expect((await download(new Request("http://test/x"), ctx({ id: "abc" }))).status).toBe(404);
  });

  it("keeps the Demo and real worlds apart", async () => {
    const c = await offered();
    signInDemo("authority");
    expect((await pdf(c)).status).toBe(404);
    signInDemo("office");
    expect((await pdf(c)).status).toBe(404);
    const [{ id: demoContract }] = await app.sql.query<{ id: number }>(
      "SELECT c.id FROM contracts c JOIN issues i ON i.id = c.issue_id WHERE i.is_demo ORDER BY c.id LIMIT 1",
    );
    signInAs("f7@gov.pk");
    expect((await pdf(demoContract)).status).toBe(404);
    signInDemo("authority");
    expect((await pdf(demoContract)).status).toBe(200);
  });

  it("can still be fetched after a decline or a withdrawal, and says so", async () => {
    const declined = await offered();
    signInAs("f7roads@biz.pk");
    await answer(json({ decision: "declined", reason: "No workers free" }), id(declined));
    const withdrawn = await offered();
    signInAs("f7@gov.pk");
    await withdraw(new Request("http://test/x", { method: "DELETE" }), id(withdrawn));
    signInAs("f7@gov.pk");
    expect(textOf(Buffer.from(await (await pdf(declined)).arrayBuffer()))).toContain("No workers free");
    expect(textOf(Buffer.from(await (await pdf(withdrawn)).arrayBuffer()))).toContain("Withdrawn");
  });
});

describe("the PDF by email", () => {
  it("is attached when the contract is sent, and again to both sides when it is accepted", async () => {
    const c = await offered();
    expect(app.mail.sent).toHaveLength(1);
    expect(app.mail.sent[0].to).toEqual(["f7roads@biz.pk"]);
    expect(app.mail.sent[0].attachments).toHaveLength(1);
    expect(app.mail.sent[0].attachments![0]).toMatchObject({ filename: `contract-${c}.pdf`, contentType: "application/pdf" });
    expect(app.mail.sent[0].attachments![0].content.subarray(0, 5).toString()).toBe("%PDF-");

    app.mail.sent.length = 0;
    signInAs("f7roads@biz.pk");
    expect((await answer(json({ decision: "accepted" }), id(c))).status).toBe(200);
    expect(app.mail.sent.map((m) => m.to).sort()).toEqual([["f7@gov.pk"], ["f7roads@biz.pk"]]);
    for (const m of app.mail.sent) {
      expect(m.attachments).toHaveLength(1);
      expect(textOf(m.attachments![0].content)).toContain("Accepted");
    }
  });

  it("sends nothing for a Demo contract", async () => {
    const [{ id: demoContract }] = await app.sql.query<{ id: number }>(
      `SELECT c.id FROM contracts c JOIN issues i ON i.id = c.issue_id JOIN office_staff s ON s.office_id = c.office_id
       WHERE i.is_demo AND c.status = 'sent' AND s.email = $1 ORDER BY c.id LIMIT 1`,
      [DEMO_ACCOUNTS.office.email],
    );
    signInDemo("office");
    app.mail.sent.length = 0;
    expect((await answer(json({ decision: "accepted" }), id(demoContract))).status).toBe(200);
    expect(app.mail.sent).toEqual([]);
  });

  it("never breaks Send or Accept when the mailer fails", async () => {
    setMailer({ send: () => Promise.reject(new Error("smtp down")) });
    try {
      const c = await offered();
      signInAs("f7roads@biz.pk");
      expect((await answer(json({ decision: "accepted" }), id(c))).status).toBe(200);
    } finally {
      setMailer(app.mail);
    }
  });
});
