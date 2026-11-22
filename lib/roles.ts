import { demoMode, Identity, session } from "./session";
import { Sql, sql } from "./sql";

import { ROLES, type Role } from "./roles-list";

export { ROLES, type Role };

/** The signed-in person with their role, derived from the database and server settings on every call. */
export interface Actor {
  personId: string;
  authId: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  role: Role;
  /** Office staff only: the one Office they work for. */
  officeId: number | null;
  isDemo: boolean;
  profileComplete: boolean;
  suspended: boolean;
}

const superAdminEmails = () =>
  (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/** Which data a visitor sees: a Demo account sees Demo data, a real account sees real data, nobody sees Demo data only while Demo mode is on. */
export async function dataWorld(): Promise<{ demo: boolean }> {
  const who = await session();
  return { demo: who ? who.isDemo : demoMode() };
}

export async function deriveRole(who: Identity, q: Sql = sql()): Promise<{ role: Role; officeId: number | null }> {
  const email = who.email?.toLowerCase() ?? null;
  if (who.isDemo ? who.demoKey === "superAdmin" : !!email && superAdminEmails().includes(email))
    return { role: "super_admin", officeId: null };
  if (!email) return { role: "citizen", officeId: null };
  const approved = await q.query(
    "SELECT 1 FROM access_requests WHERE lower(official_email) = $1 AND decision = 'approved' AND is_demo = $2 LIMIT 1",
    [email, who.isDemo],
  );
  if (approved.length) return { role: "authority", officeId: null };
  const [staff] = await q.query<{ office_id: number }>(
    `SELECT s.office_id FROM office_staff s JOIN offices o ON o.id = s.office_id
     WHERE lower(s.email) = $1 AND o.is_demo = $2 LIMIT 1`,
    [email, who.isDemo],
  );
  if (staff) return { role: "office", officeId: staff.office_id };
  return { role: "citizen", officeId: null };
}

interface PersonRow {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  suspended_at: string | null;
}

/** The actor for this request, or null when nobody is signed in. First sign-in creates the person row. */
export async function currentActor(): Promise<Actor | null> {
  const who = await session();
  if (!who) return null;
  const q = sql();
  let [p] = await q.query<PersonRow>(
    "SELECT id, email, display_name, phone, suspended_at FROM people WHERE auth_id = $1",
    [who.authId],
  );
  if (!p) {
    // The stored email is a convenience for staff screens; if another row already holds it, keep it off this one.
    [p] = await q.query<PersonRow>(
      `INSERT INTO people (auth_id, email, is_demo)
       VALUES ($1, CASE WHEN EXISTS (SELECT 1 FROM people WHERE email = $2) THEN NULL ELSE $2 END, $3)
       ON CONFLICT (auth_id) DO UPDATE SET auth_id = EXCLUDED.auth_id
       RETURNING id, email, display_name, phone, suspended_at`,
      [who.authId, who.email, who.isDemo],
    );
  } else if (who.email && p.email !== who.email && !who.isDemo) {
    await q.query(
      "UPDATE people SET email = $1 WHERE id = $2 AND NOT EXISTS (SELECT 1 FROM people WHERE email = $1)",
      [who.email, p.id],
    );
  }
  const { role, officeId } = await deriveRole(who, q);
  return {
    personId: p.id,
    authId: who.authId,
    email: who.email,
    displayName: p.display_name,
    phone: p.phone,
    role,
    officeId,
    isDemo: who.isDemo,
    profileComplete: !!p.display_name?.trim() && !!p.phone,
    suspended: !!p.suspended_at,
  };
}

/** Use at the top of every API route: `const a = await requireRole("authority"); if (a instanceof Response) return a;` */
export async function requireRole(...allowed: Role[]): Promise<Actor | Response> {
  const a = await currentActor();
  if (!a) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (!allowed.includes(a.role)) return Response.json({ error: "forbidden" }, { status: 403 });
  return a;
}

/** Any signed-in person, whatever their role. */
export async function requireSignedIn(): Promise<Actor | Response> {
  return requireRole(...ROLES);
}
