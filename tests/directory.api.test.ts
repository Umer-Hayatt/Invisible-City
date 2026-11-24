import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as suggested } from "../app/api/issues/[id]/offices/route";
import { GET as me } from "../app/api/me/route";
import { POST as addOffice } from "../app/api/offices/route";
import { POST as addStaff } from "../app/api/offices/[id]/staff/route";
import { DELETE as revokeAuthority, GET as authorities } from "../app/api/super-admin/authorities/route";
import { GET as businesses } from "../app/api/super-admin/businesses/route";
import { POST as decide } from "../app/api/offices/registrations/[id]/route";
import { GET as registrations } from "../app/api/offices/registrations/route";
import { POST as register } from "../app/api/register-office/route";
import { DELETE as revokeBusiness, POST as restoreBusiness } from "../app/api/super-admin/businesses/[id]/route";
import { setSession } from "../lib/session";
import { assign, ctx, offer, SUPER_ADMIN, signInAs, startTestApp } from "./helpers";

/**
 * The Super Admin's directory: every Authority and Business, and revoking either at any time. A revoked Authority
 * is a Citizen again; a revoked Business cannot sign in or be assigned, and its unfinished jobs go back to Open.
 */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
  await app.sql.query(
    `INSERT INTO access_requests (name, official_email, phone, decision, decided_at, is_demo, area) VALUES
       ('Hina', 'hina@gov.pk', '+92 300 1111111', 'approved', now(), false, 'F-7'),
       ('Omar', 'omar@gov.pk', '+92 300 2222222', 'approved', now(), false, NULL)`,
  );
});
afterAll(() => app.stop());
beforeEach(() => setSession(null));

const json = (data: unknown) =>
  new Request("http://test/x", { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const del = (url = "http://test/x") => new Request(url, { method: "DELETE" });
const roleOf = async (email: string) => {
  signInAs(email);
  return (await (await me()).json()).me.role as string;
};

describe("the Super Admin directory", () => {
  it("is for the Super Admin only", async () => {
    signInAs("omar@gov.pk");
    expect((await authorities()).status).toBe(403);
    expect((await businesses()).status).toBe(403);
  });

  it("lists every Authority with its area and contact details", async () => {
    signInAs(SUPER_ADMIN);
    const { authorities: list } = await (await authorities()).json();
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "hina@gov.pk", name: "Hina", area: "F-7", phone: "+92 300 1111111", revoked_at: null }),
        expect.objectContaining({ email: "omar@gov.pk", area: null }),
      ]),
    );
  });

  it("revokes an Authority, who is a Citizen again on the next request", async () => {
    expect(await roleOf("hina@gov.pk")).toBe("authority");
    signInAs(SUPER_ADMIN);
    expect((await revokeAuthority(del("http://test/x?email=Hina@gov.pk"))).status).toBe(200);
    expect((await revokeAuthority(del("http://test/x?email=hina@gov.pk"))).status).toBe(404);
    expect(app.mail.sent.at(-1)?.to).toEqual(["hina@gov.pk"]);
    expect(await roleOf("hina@gov.pk")).toBe("citizen");
    signInAs(SUPER_ADMIN);
    const { authorities: list } = await (await authorities()).json();
    expect(list.find((a: { email: string }) => a.email === "hina@gov.pk").revoked_at).not.toBeNull();
  });

  it("revokes a Business: no sign-in, no Assignments, and its unfinished jobs go back to Open", async () => {
    // A real Roads Business in F-7 with one Assigned Issue.
    signInAs("omar@gov.pk");
    const [{ id: roads }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
    const officeId = (await (await addOffice(json({ name: "Revoke Roads", departmentId: roads, sector: "F-7", lat: 33.72, lng: 73.05 }))).json()).id;
    await addStaff(json({ email: "revoke-crew@gov.pk" }), ctx({ id: String(officeId) }));
    const [issue] = await app.sql.query<{ id: number }>(
      `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, is_demo, report_count, created_at, updated_at)
       VALUES ('road_damage', 'medium', 'Pothole', 'Pothole.', 33.72, 73.05, 'F-7', 'open', 1, false, 1, now(), now()) RETURNING id`,
    );
    expect((await assign(issue.id, officeId)).status).toBe(200);
    expect(await roleOf("revoke-crew@gov.pk")).toBe("office");

    signInAs(SUPER_ADMIN);
    const listed = (await (await businesses()).json()).businesses.find((b: { id: number }) => b.id === officeId);
    expect(listed).toMatchObject({ name: "Revoke Roads", email: "revoke-crew@gov.pk", active: 1, revoked_at: null });
    const res = await revokeBusiness(del(), ctx({ id: String(officeId) }));
    expect(res.status).toBe(200);
    expect((await res.json()).reopened).toBe(1);
    expect((await revokeBusiness(del(), ctx({ id: String(officeId) }))).status).toBe(404);

    const [after] = await app.sql.query<{ status: string; office_id: number | null }>("SELECT status, office_id FROM issues WHERE id = $1", [issue.id]);
    expect(after).toEqual({ status: "open", office_id: null });
    expect(await roleOf("revoke-crew@gov.pk")).toBe("citizen");

    signInAs("omar@gov.pk");
    const offers = (await (await suggested(new Request("http://test/x"), ctx({ id: String(issue.id) }))).json()).offices;
    expect(offers.map((o: { id: number }) => o.id)).not.toContain(officeId);
    expect((await offer(issue.id, officeId)).status).toBe(400);
  });

  it("restores a revoked Business, which signs in again", async () => {
    const [{ id: officeId }] = await app.sql.query<{ id: number }>("SELECT id FROM offices WHERE name = 'Revoke Roads'");
    signInAs("omar@gov.pk");
    expect((await restoreBusiness(json({}), ctx({ id: String(officeId) }))).status).toBe(403);
    signInAs(SUPER_ADMIN);
    expect((await restoreBusiness(json({}), ctx({ id: String(officeId) }))).status).toBe(200);
    expect(app.mail.sent.at(-1)?.to).toEqual(["revoke-crew@gov.pk"]);
    expect((await restoreBusiness(json({}), ctx({ id: String(officeId) }))).status).toBe(404);
    expect(await roleOf("revoke-crew@gov.pk")).toBe("office");
  });

  it("lets a revoked Business register again; the Authority sees it was revoked, and approval moves its email", async () => {
    const [{ id: officeId, department_id }] = await app.sql.query<{ id: number; department_id: number }>(
      "SELECT id, department_id FROM offices WHERE name = 'Revoke Roads'",
    );
    signInAs(SUPER_ADMIN);
    expect((await revokeBusiness(del(), ctx({ id: String(officeId) }))).status).toBe(200);
    signInAs("revoke-crew@gov.pk");
    const form = { name: "Roads Again", departmentId: department_id, sector: "F-7", isPrivate: true, workers: 3, contactName: "Crew Lead", phone: "0300 7654321" };
    expect((await register(json(form))).status).toBe(201);
    signInAs("omar@gov.pk");
    const { registrations: list } = await (await registrations()).json();
    const r = list.find((x: { email: string }) => x.email === "revoke-crew@gov.pk");
    expect(r.revoked_before).toBe(true);
    expect((await decide(json({ decision: "approved" }), ctx({ id: String(r.id) }))).status).toBe(200);
    expect(await roleOf("revoke-crew@gov.pk")).toBe("office");
    const staff = await app.sql.query<{ name: string }>(
      "SELECT o.name FROM office_staff s JOIN offices o ON o.id = s.office_id WHERE s.email = 'revoke-crew@gov.pk'",
    );
    expect(staff).toEqual([{ name: "Roads Again" }]);
  });
});
