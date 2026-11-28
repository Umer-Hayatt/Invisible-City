import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as myOffice } from "../app/api/office/route";
import { GET as listOffices } from "../app/api/offices/route";
import { GET as listRegistrations } from "../app/api/offices/registrations/route";
import { POST as authorityDecide } from "../app/api/offices/registrations/[id]/route";
import { GET as myRegistration, POST as register } from "../app/api/register-office/route";
import { GET as suggested } from "../app/api/issues/[id]/offices/route";
import { GET as listNgos } from "../app/api/super-admin/ngos/route";
import { POST as decideNgo } from "../app/api/super-admin/ngos/[id]/route";
import { GET as listBusinesses } from "../app/api/super-admin/businesses/route";
import { setSession } from "../lib/session";
import { ctx, signInAs, signInDemo, startTestApp, SUPER_ADMIN } from "./helpers";

/**
 * NGOs (28 November 2026): a non-profit registers as a third kind of Business with its registration number. The Super
 * Admin, not an Authority, decides it; once approved it signs in and works like a Business of its sector.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
let sanitationId: number;
let roadsId: number;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, decision, decided_at, is_demo, area) VALUES
       ('Whole city', 'city@gov.pk', 'approved', now(), false, NULL),
       ('G-9 only', 'g9@gov.pk', 'approved', now(), false, 'G-9')`,
  );
  [{ id: sanitationId }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Sanitation'");
  [{ id: roadsId }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

const json = (data: unknown) => new Request("http://test/x", { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const ngoForm = (over: Record<string, unknown> = {}) => ({
  name: "Helping Hands Islamabad",
  departmentId: sanitationId,
  sector: "G-9",
  isNgo: true,
  isPrivate: true,
  registrationNumber: "ICT-SWD-2020-0099",
  website: "helpinghands.org.pk",
  about: "Weekend clean-ups of streets and drains.",
  workers: 30,
  contactName: "Sana Malik",
  phone: "0300 1112233",
  ...over,
});
type Reg = { id: number; email: string; decision: string; is_ngo: boolean };
const ngoPending = async (email: string) => {
  const { registrations } = await (await listNgos()).json();
  return (registrations as Reg[]).find((r) => r.email === email && r.decision === "pending");
};

describe("NGO registration", () => {
  it("needs a registration number, and checks the website", async () => {
    signInAs("ngo-bad@gmail.com");
    for (const [over, error] of [
      [{ registrationNumber: "" }, "invalid_registration_number"],
      [{ registrationNumber: "x".repeat(61) }, "invalid_registration_number"],
      [{ website: "not a site" }, "invalid_website"],
      [{ about: "a".repeat(501) }, "invalid_about"],
    ] as const) {
      const res = await register(json(ngoForm(over)));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(error);
    }
  });

  it("files the NGO with its details; it is an NGO, not a private firm", async () => {
    signInAs("ngo@gmail.com");
    expect((await register(json(ngoForm()))).status).toBe(201);
    const { registration } = await (await myRegistration()).json();
    expect(registration).toMatchObject({
      name: "Helping Hands Islamabad",
      is_ngo: true,
      is_private: false,
      registration_number: "ICT-SWD-2020-0099",
      website: "https://helpinghands.org.pk",
      decision: "pending",
    });
  });

  it("is not shown to, or decided by, an Authority, even of its own area", async () => {
    for (const who of ["g9@gov.pk", "city@gov.pk"]) {
      signInAs(who);
      const { registrations } = await (await listRegistrations()).json();
      expect((registrations as Reg[]).some((r) => r.email === "ngo@gmail.com")).toBe(false);
    }
    signInAs(SUPER_ADMIN);
    const r = (await ngoPending("ngo@gmail.com"))!;
    signInAs("city@gov.pk");
    expect((await authorityDecide(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(404);
  });

  it("is listed for the Super Admin only", async () => {
    signInAs("city@gov.pk");
    expect((await listNgos()).status).toBe(403);
    signInAs("ngo@gmail.com");
    expect((await listNgos()).status).toBe(403);
    signInAs(SUPER_ADMIN);
    expect(await ngoPending("ngo@gmail.com")).toBeTruthy();
  });

  it("a Business registration stays with the Authority: the Super Admin cannot decide it as an NGO", async () => {
    signInAs("firm@gmail.com");
    await register(json(ngoForm({ name: "Road Firm", departmentId: roadsId, isNgo: false, registrationNumber: "" })));
    signInAs("g9@gov.pk");
    const { registrations } = await (await listRegistrations()).json();
    const firm = (registrations as Reg[]).find((r) => r.email === "firm@gmail.com")!;
    expect(firm.is_ngo).toBe(false);
    signInAs(SUPER_ADMIN);
    expect((await decideNgo(json({ decision: "approved" }), ctx({ id: String(firm.id) }))).status).toBe(404);
  });

  it("on the Super Admin's approval becomes a Business of kind NGO, and its email signs in as it", async () => {
    signInAs(SUPER_ADMIN);
    const r = (await ngoPending("ngo@gmail.com"))!;
    app.mail.sent.length = 0;
    expect((await decideNgo(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(200);
    expect((await decideNgo(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(409);
    expect(app.mail.sent[0]).toMatchObject({ to: ["ngo@gmail.com"], subject: "Helping Hands Islamabad is now an NGO on Civora" });

    const { businesses } = await (await listBusinesses()).json();
    expect(businesses.find((b: { name: string }) => b.name === "Helping Hands Islamabad")).toMatchObject({
      is_ngo: true,
      is_private: false,
      registration_number: "ICT-SWD-2020-0099",
      sector: "G-9",
    });

    // The Authority of its area sees it with its other Businesses.
    signInAs("g9@gov.pk");
    const { offices } = await (await listOffices()).json();
    expect(offices.find((o: { name: string }) => o.name === "Helping Hands Islamabad")).toMatchObject({ is_ngo: true });

    signInAs("ngo@gmail.com");
    const mine = await (await myOffice()).json();
    expect(mine.office).toMatchObject({ name: "Helping Hands Islamabad", is_ngo: true, website: "https://helpinghands.org.pk" });
  });

  it("can be declined; the NGO is emailed", async () => {
    signInAs("ngo2@gmail.com");
    await register(json(ngoForm({ name: "Second NGO" })));
    signInAs(SUPER_ADMIN);
    const r = (await ngoPending("ngo2@gmail.com"))!;
    app.mail.sent.length = 0;
    expect((await decideNgo(json({ decision: "declined" }), ctx({ id: String(r.id) }))).status).toBe(200);
    expect(app.mail.sent[0].subject).toBe("Your NGO registration for Second NGO");
    signInAs("ngo2@gmail.com");
    expect((await (await myRegistration()).json()).registration.decision).toBe("declined");
  });
});

describe("NGOs in the Demo", () => {
  it("the Demo Super Admin has an NGO waiting, and never sees real ones", async () => {
    signInDemo("superAdmin");
    const { registrations } = await (await listNgos()).json();
    expect((registrations as { name: string; decision: string }[]).map((r) => [r.name, r.decision])).toEqual([["Green Hands Foundation", "pending"]]);
  });

  it("the approved Demo NGO is suggested for G-9's rubbish, marked as an NGO", async () => {
    const [garbage] = await app.sql.query<{ id: number }>(
      "SELECT id FROM issues WHERE is_demo AND neighborhood = 'G-9' AND category = 'garbage' AND deleted_at IS NULL LIMIT 1",
    );
    signInDemo("authority");
    const { offices } = await (await suggested(new Request("http://test/x"), ctx({ id: String(garbage.id) }))).json();
    expect(offices.find((o: { name: string }) => o.name === "Clean Islamabad Trust")).toMatchObject({ is_ngo: true, sector: "G-9" });
  });
});
