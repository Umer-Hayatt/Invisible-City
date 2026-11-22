import { nowIso } from "./clock";
import { addEvent, setAssignment } from "./db";
import { haversineMeters } from "./geo";
import { sendQuietly } from "./mailer";
import { recountIssue } from "./reporting";
import { sql } from "./sql";

export interface OfficeRow {
  id: number;
  name: string;
  department: string;
  sector: string;
  lat: number;
  lng: number;
}

/** Offices of the Department that handles this Issue's Category, nearest first, with distance in metres. */
export async function suggestedOffices(issueId: number, demo: boolean) {
  const q = sql();
  const [issue] = await q.query<{ category: string; lat: number; lng: number }>(
    "SELECT category, lat, lng FROM issues WHERE id = $1 AND deleted_at IS NULL AND is_demo = $2",
    [issueId, demo],
  );
  if (!issue) return null;
  const offices = await q.query<OfficeRow>(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.lat, o.lng
     FROM offices o JOIN departments d ON d.id = o.department_id
     JOIN categories c ON c.department_id = d.id
     WHERE c.key = $1 AND o.is_demo = $2`,
    [issue.category, demo],
  );
  return offices
    .map((o) => ({ ...o, distance: Math.round(haversineMeters(issue.lat, issue.lng, o.lat, o.lng)) }))
    .sort((a, b) => a.distance - b.distance);
}

export type AssignOutcome = "assigned" | "not_found" | "conflict" | "invalid_office";

/** Open Issue to Assigned, only to one of the suggested Offices; the Office's staff are emailed. */
export async function assignIssue(issueId: number, officeId: number, demo: boolean): Promise<AssignOutcome> {
  const offices = await suggestedOffices(issueId, demo);
  if (!offices) return "not_found";
  const office = offices.find((o) => o.id === officeId);
  if (!office) return "invalid_office";
  const result = await sql().tx(async (q) => {
    const [issue] = await q.query<{ status: string; title: string; neighborhood: string; severity: string }>(
      "SELECT status, title, neighborhood, severity FROM issues WHERE id = $1 FOR UPDATE",
      [issueId],
    );
    if (issue.status !== "open") return null;
    await setAssignment(issueId, officeId, "assigned", q);
    await addEvent(issueId, "assigned", `Assigned to ${office.name}`, nowIso(), q);
    return issue;
  });
  if (!result) return "conflict";
  if (!demo) {
    const staff = await sql().query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [officeId]);
    await sendQuietly({
      to: staff.map((s) => s.email),
      subject: `New job for ${office.name}: ${result.title}`,
      body: [
        `Invisible City has assigned a new Issue to ${office.name}.`,
        "",
        `${result.title} (${result.severity}) in ${result.neighborhood}`,
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/issues/${issueId}`,
      ].join("\n"),
    });
  }
  return "assigned";
}

export type FlagOutcome = { status: "not_found" } | { status: "flagged"; issueRemoved: boolean; suspended: boolean };

/** Hides a Report; removes a lone-Report Issue; a Citizen's third flagged Report suspends them. */
export function flagSpam(issueId: number, reportId: number, authorityId: string, demo: boolean): Promise<FlagOutcome> {
  return sql().tx(async (q) => {
    const [row] = await q.query<{ reporter_id: string }>(
      `SELECT r.reporter_id FROM reports r JOIN issues i ON i.id = r.issue_id
       WHERE r.id = $1 AND r.issue_id = $2 AND NOT r.is_spam AND r.deleted_at IS NULL
         AND i.deleted_at IS NULL AND i.is_demo = $3 FOR UPDATE OF r`,
      [reportId, issueId, demo],
    );
    if (!row) return { status: "not_found" as const };
    const now = nowIso();
    await q.query("UPDATE reports SET is_spam = true, flagged_by = $1 WHERE id = $2", [authorityId, reportId]);
    const issueRemoved = await recountIssue(q, issueId, now, "A report was flagged as spam and hidden.");
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
    return { status: "flagged" as const, issueRemoved, suspended };
  });
}

// ---------------------------------------------------------------------------
// Offices and their staff
// ---------------------------------------------------------------------------

export async function listOffices(demo: boolean) {
  const q = sql();
  const offices = await q.query<OfficeRow>(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.lat, o.lng
     FROM offices o JOIN departments d ON d.id = o.department_id WHERE o.is_demo = $1 ORDER BY d.name, o.name`,
    [demo],
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

export async function addOffice(o: { name: string; departmentId: number; sector: string; lat: number; lng: number }, demo: boolean) {
  const [dept] = await sql().query("SELECT 1 FROM departments WHERE id = $1", [o.departmentId]);
  if (!dept) return null;
  const [row] = await sql().query<{ id: number }>(
    "INSERT INTO offices (name, department_id, sector, lat, lng, is_demo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [o.name, o.departmentId, o.sector, o.lat, o.lng, demo],
  );
  return row.id;
}

export type StaffOutcome = "added" | "not_found" | "email_taken";

/** One Office per email: an email already on any Office's staff is refused. */
export async function addStaff(officeId: number, email: string, demo: boolean): Promise<StaffOutcome> {
  const [office] = await sql().query("SELECT 1 FROM offices WHERE id = $1 AND is_demo = $2", [officeId, demo]);
  if (!office) return "not_found";
  const rows = await sql().query(
    "INSERT INTO office_staff (office_id, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
    [officeId, email],
  );
  return rows.length ? "added" : "email_taken";
}

export async function removeStaff(officeId: number, staffId: number, demo: boolean) {
  const rows = await sql().query(
    `DELETE FROM office_staff s USING offices o
     WHERE s.id = $1 AND s.office_id = $2 AND o.id = s.office_id AND o.is_demo = $3 RETURNING s.id`,
    [staffId, officeId, demo],
  );
  return rows.length > 0;
}
