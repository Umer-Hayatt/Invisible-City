import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as decide } from "../app/api/offices/registrations/[id]/route";
import { GET as registrations } from "../app/api/offices/registrations/route";
import { POST as register } from "../app/api/register-office/route";
import { DELETE as revokeAuthority } from "../app/api/super-admin/authorities/route";
import { DELETE as revokeBusiness, POST as restoreBusiness } from "../app/api/super-admin/businesses/[id]/route";
import { GET as businesses } from "../app/api/super-admin/businesses/route";
import { DEMO_ACCOUNTS } from "../lib/demo-accounts";
import { ctx, signInDemo, startTestApp } from "./helpers";

/** Anyone can be a Demo account, and a Demo Business can be given any email address, so the Demo never sends email. */
let app: Awaited<ReturnType<typeof startTestApp>>;
beforeAll(async () => {
  app = await startTestApp({ seed: true });
});
afterAll(() => app.stop());
beforeEach(() => {
  app.mail.sent.length = 0;
});

const json = (data: unknown) =>
  new Request("http://test/x", { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });
const del = (url = "http://test/x") => new Request(url, { method: "DELETE" });

describe("the Demo never sends email", () => {
  it.each(["declined", "approved"])("when a Business registration is %s", async (decision) => {
    const [{ id: departmentId }] = await app.sql.query<{ id: number }>("SELECT id FROM departments WHERE name = 'Roads'");
    signInDemo("citizen");
    const form = { name: `Demo Roads ${decision}`, departmentId, sector: "F-7", isPrivate: true, workers: 3, contactName: "Lead", phone: "0300 7654321" };
    expect((await register(json(form))).status).toBe(201);
    signInDemo("authority");
    const { registrations: list } = await (await registrations()).json();
    const r = list.find((x: { name: string }) => x.name === form.name);
    expect((await decide(json({ decision }), ctx({ id: String(r.id) }))).status).toBe(200);
    expect(app.mail.sent).toEqual([]);
  });

  it("when a Business is revoked and restored", async () => {
    signInDemo("superAdmin");
    const list = (await (await businesses()).json()).businesses as { id: number; email: string | null }[];
    const b = list.find((x) => x.email)!;
    expect((await revokeBusiness(del(), ctx({ id: String(b.id) }))).status).toBe(200);
    expect((await restoreBusiness(json({}), ctx({ id: String(b.id) }))).status).toBe(200);
    expect(app.mail.sent).toEqual([]);
  });

  it("when an Authority is revoked", async () => {
    signInDemo("superAdmin");
    expect((await revokeAuthority(del(`http://test/x?email=${DEMO_ACCOUNTS.authority.email}`))).status).toBe(200);
    expect(app.mail.sent).toEqual([]);
  });
});
