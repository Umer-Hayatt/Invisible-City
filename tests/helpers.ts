import fs from "node:fs";
import path from "node:path";
import { PGlite, types } from "@electric-sql/pglite";
import { POST as answer } from "../app/api/contracts/[id]/route";
import { POST as sendContract } from "../app/api/issues/[id]/contract/route";
import { DEMO_ACCOUNTS, type DemoKey } from "../lib/demo-accounts";
import { seedDemoData } from "../db/seed-data";
import { setClock } from "../lib/clock";
import { fakeMailer, setMailer } from "../lib/mailer";
import { fakePhotoStore, setPhotoStore } from "../lib/photo-store";
import { Identity, session, setSession } from "../lib/session";
import { Sql, setSql, sql as db } from "../lib/sql";

const MIGRATIONS = path.join(__dirname, "..", "db", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">, tx: Sql["tx"]): Sql => ({
    async query<T>(text: string, params?: unknown[]) {
      return (await c.query(text, params)).rows as T[];
    },
    tx,
  });
  return wrap(db, (fn) => db.transaction((t) => fn(wrap(t, (f) => f(wrap(t, null as never))))));
}

/**
 * A fresh in-process Postgres with the real migrations, wired in as the app's database, plus the
 * fake adapters: a Photo store that returns one fixed URL and a Clock frozen at NOW.
 * Tests call the real API route handlers and look at what they return.
 */
export const SUPER_ADMIN = "boss@example.com";
export const NOW = new Date("2026-11-22T12:00:00Z");

export async function startTestApp(opts: { seed?: boolean } = {}) {
  const pg = new PGlite({ parsers: { [types.TIMESTAMPTZ]: (v: string) => new Date(v).toISOString() } });
  for (const f of fs.readdirSync(MIGRATIONS).sort()) await pg.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  const sql = pgliteSql(pg);
  setSql(sql);
  setClock(NOW);
  process.env.DEMO_MODE = "true";
  process.env.SUPER_ADMIN_EMAILS = SUPER_ADMIN;
  setSession(null);
  const photos = fakePhotoStore();
  setPhotoStore(photos);
  const mail = fakeMailer();
  setMailer(mail);
  if (opts.seed) await seedDemoData(sql, { now: NOW });
  return { pg, sql, photos, mail, stop: () => pg.close() };
}

export const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;

/** Sign in as a real (non-demo) person with this email; nobody if null. */
export const signInAs = (email: string | null, authId = "real-" + email) =>
  setSession(email ? ({ authId, email, isDemo: false } as Identity) : null);
/** Sign in as one of the Demo accounts. */
export const signInDemo = (key: DemoKey) =>
  setSession({ authId: "demo-" + key, email: DEMO_ACCOUNTS[key].email, isDemo: true, demoKey: key });

/** Contract terms that are always acceptable. */
export const TERMS = { scope: "Repair the problem and clean up.", pricePkr: 50_000, startDate: "", finishDate: "2030-01-31", paymentTerms: "" };

const post = (data: unknown) =>
  new Request("http://test/x", { method: "POST", body: JSON.stringify(data), headers: { "content-type": "application/json" } });

/** The signed-in Authority offers an Issue to an Office as a contract; the answer is the API's. */
export const offer = (issueId: number, officeId: number, terms: Record<string, unknown> = {}) =>
  sendContract(post({ officeId, ...TERMS, ...terms }), ctx({ id: String(issueId) }));

/**
 * The only way to Assigned: the signed-in Authority sends a contract and the Office accepts it. Returns the first answer
 * that is not a success, or the acceptance. Whoever was signed in stays signed in.
 */
export async function assign(issueId: number, officeId: number) {
  const sent = await offer(issueId, officeId);
  if (sent.status !== 201) return sent;
  const before = await session();
  const [staff] = await db().query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [officeId]);
  if (before?.isDemo) signInDemo("office");
  else signInAs(staff.email);
  const res = await answer(post({ decision: "accepted" }), ctx({ id: String((await sent.json()).id) }));
  setSession(before);
  return res;
}
