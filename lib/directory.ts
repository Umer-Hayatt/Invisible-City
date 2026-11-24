import { nowIso } from "./clock";
import { addEvent, setAssignment } from "./db";
import { sendQuietly } from "./mailer";
import { Sql, sql } from "./sql";

/**
 * The Super Admin's directory: every Authority and every Business (an Office) of one world, with their details,
 * revoking either at any time, and restoring a Business.
 */
export interface AuthorityEntry {
  email: string;
  name: string;
  department: string | null;
  area: string | null;
  phone: string | null;
  approved_at: string | null;
  revoked_at: string | null;
}

/** One row per Authority email: the latest approval, and whether it has been revoked. */
export async function listAuthorities(demo: boolean) {
  return sql().query<AuthorityEntry>(
    `SELECT DISTINCT ON (lower(r.official_email)) lower(r.official_email) AS email, r.name, d.name AS department, r.area,
            r.phone, r.decided_at AS approved_at, r.revoked_at
     FROM access_requests r LEFT JOIN departments d ON d.id = r.department_id
     WHERE r.decision = 'approved' AND r.is_demo = $1
     ORDER BY lower(r.official_email), r.decided_at DESC NULLS LAST, r.id DESC`,
    [demo],
  );
}

export interface BusinessEntry {
  id: number;
  name: string;
  department: string;
  sector: string;
  is_private: boolean;
  workers: number;
  phone: string | null;
  email: string | null;
  active: number;
  fixes: number;
  revoked_at: string | null;
}

/** Every Business with its one email, the jobs it holds now and the Fixes it has made. */
export async function listBusinesses(demo: boolean) {
  return sql().query<BusinessEntry>(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.is_private, o.workers, o.phone, o.revoked_at,
            (SELECT s.email FROM office_staff s WHERE s.office_id = o.id ORDER BY s.id LIMIT 1) AS email,
            (SELECT COUNT(*) FROM issues i WHERE i.office_id = o.id AND i.deleted_at IS NULL
               AND i.status IN ('assigned', 'in_progress'))::int AS active,
            (SELECT COUNT(*) FROM issues i WHERE i.office_id = o.id AND i.deleted_at IS NULL
               AND i.status IN ('fixed', 'resolved', 'closed_unconfirmed'))::int AS fixes
     FROM offices o JOIN departments d ON d.id = o.department_id
     WHERE o.is_demo = $1 ORDER BY (o.revoked_at IS NULL) DESC, d.name, o.name`,
    [demo],
  );
}

/** Revokes every approval of this Authority email. They are a Citizen again on their next page load. */
export async function revokeAuthority(email: string, by: string | null, demo: boolean) {
  const rows = await sql().query(
    `UPDATE access_requests SET revoked_at = $1, revoked_by = $2
     WHERE lower(official_email) = lower($3) AND decision = 'approved' AND revoked_at IS NULL AND is_demo = $4 RETURNING id`,
    [nowIso(), by, email, demo],
  );
  if (rows.length)
    await sendQuietly({
      to: [email],
      subject: "Your Authority access on Invisible City was revoked",
      body: "The Invisible City team has revoked your Authority access. You can still use the app as a Citizen. Contact the team if you think this is a mistake.",
    });
  return rows.length > 0;
}

/**
 * Revokes a Business: it can no longer sign in as a Business or be assigned, and every job it had not finished
 * (Assigned or In progress) goes back to Open for the Authority, with a note on the public timeline. Contracts waiting
 * for its answer are withdrawn.
 */
export async function revokeBusiness(officeId: number, by: string | null, demo: boolean) {
  const out = await sql().tx(async (q: Sql) => {
    const [office] = await q.query<{ name: string }>(
      "UPDATE offices SET revoked_at = $1, revoked_by = $2 WHERE id = $3 AND is_demo = $4 AND revoked_at IS NULL RETURNING name",
      [nowIso(), by, officeId, demo],
    );
    if (!office) return null;
    const jobs = await q.query<{ id: number }>(
      "SELECT id FROM issues WHERE office_id = $1 AND status IN ('assigned', 'in_progress') AND deleted_at IS NULL",
      [officeId],
    );
    for (const j of jobs) {
      await setAssignment(j.id, null, "open", q);
      await addEvent(j.id, "sent_back", `Back to Open: ${office.name} no longer works with the city`, nowIso(), q);
    }
    await q.query("UPDATE contracts SET status = 'withdrawn', decided_at = $1, decided_by = $2 WHERE office_id = $3 AND status = 'sent'", [
      nowIso(),
      by,
      officeId,
    ]);
    const emails = await q.query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [officeId]);
    return { name: office.name, reopened: jobs.length, emails: emails.map((e) => e.email) };
  });
  if (out)
    await sendQuietly({
      to: out.emails,
      subject: `${out.name}: access to Invisible City was revoked`,
      body: `The Invisible City team has revoked ${out.name}'s access as a Business. Jobs not yet fixed have gone back to the city.`,
    });
  return out;
}

/** Gives a revoked Business its access back. Jobs that went back to Open stay Open; it asks for or is given new ones. */
export async function restoreBusiness(officeId: number, demo: boolean) {
  const [office] = await sql().query<{ name: string }>(
    "UPDATE offices SET revoked_at = NULL, revoked_by = NULL WHERE id = $1 AND is_demo = $2 AND revoked_at IS NOT NULL RETURNING name",
    [officeId, demo],
  );
  if (!office) return null;
  if (!demo) {
    const emails = await sql().query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [officeId]);
    await sendQuietly({
      to: emails.map((e) => e.email),
      subject: `${office.name}: access to Invisible City was restored`,
      body: `The Invisible City team has given ${office.name} its access back. Sign in with this Google account to see its jobs.`,
    });
  }
  return office;
}
