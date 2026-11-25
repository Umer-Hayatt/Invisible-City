import { nowIso } from "./clock";
import { emailWithdrawn } from "./contract-ends";
import { haversineMeters } from "./geo";
import { recountIssue } from "./reporting";
import { Sql, sql } from "./sql";

export interface OfficeRow {
  id: number;
  name: string;
  department: string;
  sector: string;
  lat: number;
  lng: number;
}

/** Whether an Issue lies in an Authority's area. An Authority with no area covers the whole city. */
export async function issueInArea(issueId: number, area: string | null) {
  if (!area) return true;
  const [issue] = await sql().query<{ neighborhood: string }>("SELECT neighborhood FROM issues WHERE id = $1", [issueId]);
  return !issue || issue.neighborhood === area;
}

/** Whether an Office lies in an Authority's area. */
export async function officeInArea(officeId: number, area: string | null) {
  if (!area) return true;
  const [office] = await sql().query<{ sector: string }>("SELECT sector FROM offices WHERE id = $1", [officeId]);
  return !office || office.sector === area;
}

/**
 * Offices of the Department that handles this Issue's Category, nearest first, with distance in metres, and whether
 * someone can sign in as the Office to answer a contract.
 */
export async function suggestedOffices(issueId: number, demo: boolean) {
  const q = sql();
  const [issue] = await q.query<{ category: string; lat: number; lng: number }>(
    "SELECT category, lat, lng FROM issues WHERE id = $1 AND deleted_at IS NULL AND is_demo = $2",
    [issueId, demo],
  );
  if (!issue) return null;
  const offices = await q.query<OfficeRow & { has_email: boolean }>(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.lat, o.lng,
            EXISTS (SELECT 1 FROM office_staff s WHERE s.office_id = o.id) AS has_email
     FROM offices o JOIN departments d ON d.id = o.department_id
     JOIN categories c ON c.department_id = d.id
     WHERE c.key = $1 AND o.is_demo = $2 AND o.revoked_at IS NULL`,
    [issue.category, demo],
  );
  return offices
    .map((o) => ({ ...o, distance: Math.round(haversineMeters(issue.lat, issue.lng, o.lat, o.lng)) }))
    .sort((a, b) => a.distance - b.distance);
}

export type FlagOutcome = { status: "not_found" } | { status: "flagged"; issueRemoved: boolean; suspended: boolean };

/** Hides a Report; removes a lone-Report Issue; a Citizen's third flagged Report suspends them. */
export async function flagSpam(issueId: number, reportId: number, authorityId: string, demo: boolean): Promise<FlagOutcome> {
  const out = await sql().tx(async (q) => {
    const [row] = await q.query<{ reporter_id: string }>(
      `SELECT r.reporter_id FROM reports r JOIN issues i ON i.id = r.issue_id
       WHERE r.id = $1 AND r.issue_id = $2 AND NOT r.is_spam AND r.deleted_at IS NULL
         AND i.deleted_at IS NULL AND i.is_demo = $3 FOR UPDATE OF r, i`,
      [reportId, issueId, demo],
    );
    if (!row) return { status: "not_found" as const };
    const now = nowIso();
    await q.query("UPDATE reports SET is_spam = true, flagged_by = $1 WHERE id = $2", [authorityId, reportId]);
    const { removed: issueRemoved, withdrawn } = await recountIssue(q, issueId, now, "A report was flagged as spam and hidden.");
    const [{ n }] = await q.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM reports WHERE reporter_id = $1 AND is_spam",
      [row.reporter_id],
    );
    let suspended = false;
    if (n >= 3) {
      const done = await q.query(
        "UPDATE people SET suspended_at = $1 WHERE id = $2 AND suspended_at IS NULL RETURNING id",
        [now, row.reporter_id],
      );
      suspended = done.length > 0;
    }
    return { status: "flagged" as const, issueRemoved, suspended, withdrawn };
  });
  if (out.status === "not_found") return out;
  const { withdrawn, ...flagged } = out;
  for (const c of withdrawn) await emailWithdrawn(c);
  return flagged;
}

// ---------------------------------------------------------------------------
// Offices and their staff
// ---------------------------------------------------------------------------

/** Offices of a world, with their one email. An Authority registered for one area sees only that area's Offices. */
export async function listOffices(demo: boolean, area: string | null = null) {
  const q = sql();
  const offices = await q.query<OfficeRow & { workers: number; is_private: boolean }>(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.lat, o.lng, o.workers, o.is_private, o.phone
     FROM offices o JOIN departments d ON d.id = o.department_id
     WHERE o.is_demo = $1 AND o.revoked_at IS NULL AND ($2::text IS NULL OR o.sector = $2) ORDER BY d.name, o.name`,
    [demo, area],
  );
  const staff = await q.query<{ id: number; office_id: number; email: string }>(
    "SELECT s.id, s.office_id, s.email FROM office_staff s JOIN offices o ON o.id = s.office_id WHERE o.is_demo = $1 ORDER BY s.email",
    [demo],
  );
  return offices.map((o) => ({ ...o, staff: staff.filter((s) => s.office_id === o.id).map(({ id, email }) => ({ id, email })) }));
}

export async function listDepartments() {
  return sql().query<{ id: number; name: string }>("SELECT id, name FROM departments ORDER BY name");
}

export async function addOffice(
  o: { name: string; departmentId: number; sector: string; lat: number; lng: number; workers?: number; isPrivate?: boolean; phone?: string | null },
  demo: boolean,
  q: Sql = sql(),
) {
  const [dept] = await q.query("SELECT 1 FROM departments WHERE id = $1", [o.departmentId]);
  if (!dept) return null;
  const [row] = await q.query<{ id: number }>(
    "INSERT INTO offices (name, department_id, sector, lat, lng, is_demo, workers, is_private, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
    [o.name, o.departmentId, o.sector, o.lat, o.lng, demo, o.workers ?? 0, o.isPrivate ?? false, o.phone ?? null],
  );
  return row.id;
}

/** How many workers an Office has; it uses this to say when it has spare hands. */
export async function setWorkers(officeId: number, workers: number, q: Sql = sql()) {
  await q.query("UPDATE offices SET workers = $1 WHERE id = $2", [workers, officeId]);
}

/** The Business's phone, which the Authorities of its area can call. */
export async function setOfficePhone(officeId: number, phone: string, q: Sql = sql()) {
  await q.query("UPDATE offices SET phone = $1 WHERE id = $2", [phone, officeId]);
}

export type StaffOutcome = "added" | "not_found" | "email_taken";

/**
 * Sets an Office's one email: it signs in with it and gets the Assignments. The email replaces whatever the Office had;
 * an email that already belongs to a different Office is refused. Runs in one transaction.
 */
export async function addStaff(officeId: number, email: string, demo: boolean, outer?: Sql): Promise<StaffOutcome> {
  const run = async (q: Sql): Promise<StaffOutcome> => {
    const [office] = await q.query("SELECT 1 FROM offices WHERE id = $1 AND is_demo = $2", [officeId, demo]);
    if (!office) return "not_found";
    const [taken] = await q.query<{ office_id: number }>("SELECT office_id FROM office_staff WHERE lower(email) = lower($1)", [email]);
    if (taken && taken.office_id !== officeId) return "email_taken";
    if (taken) return "added";
    await q.query("DELETE FROM office_staff WHERE office_id = $1", [officeId]);
    await q.query("INSERT INTO office_staff (office_id, email) VALUES ($1, $2)", [officeId, email]);
    return "added";
  };
  return outer ? run(outer) : sql().tx(run);
}

export async function removeStaff(officeId: number, staffId: number, demo: boolean) {
  const rows = await sql().query(
    `DELETE FROM office_staff s USING offices o
     WHERE s.id = $1 AND s.office_id = $2 AND o.id = s.office_id AND o.is_demo = $3 RETURNING s.id`,
    [staffId, officeId, demo],
  );
  return rows.length > 0;
}
