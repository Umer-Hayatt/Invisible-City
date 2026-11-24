import { addStaff } from "./authority";
import { nowIso } from "./clock";
import { sendQuietly } from "./mailer";
import { Sql, sql } from "./sql";

/**
 * Office staff sign-up: a signed-in person asks to join one Office; an Authority of the same world approves or
 * declines. Approval adds the request's Google email to that Office's staff, so the next page load opens My
 * Office (roles are worked out on every request). Demo and real requests never mix.
 */

export interface OfficeChoice {
  id: number;
  name: string;
  department: string;
  sector: string;
}

export interface JoinRequest {
  id: number;
  office_id: number;
  office: string;
  department: string;
  name: string;
  email: string;
  phone: string | null;
  decision: "pending" | "approved" | "declined";
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
}

const SELECT = `SELECT r.id, r.office_id, o.name AS office, d.name AS department, r.name, r.email, r.phone, r.decision,
                       r.decided_by, r.created_at, r.decided_at
                FROM office_join_requests r JOIN offices o ON o.id = r.office_id JOIN departments d ON d.id = o.department_id`;

/** The Offices a person can ask to join, grouped by Department in the form. */
export function officeChoices(demo: boolean, q: Sql = sql()) {
  return q.query<OfficeChoice>(
    `SELECT o.id, o.name, d.name AS department, o.sector FROM offices o JOIN departments d ON d.id = o.department_id
     WHERE o.is_demo = $1 ORDER BY d.name, o.name`,
    [demo],
  );
}

/** The person's most recent request in this world, so the page can show where it stands. */
export async function latestRequest(email: string, demo: boolean, q: Sql = sql()) {
  const [row] = await q.query<JoinRequest>(`${SELECT} WHERE lower(r.email) = $1 AND r.is_demo = $2 ORDER BY r.created_at DESC, r.id DESC LIMIT 1`, [
    email.toLowerCase(),
    demo,
  ]);
  return row ?? null;
}

export type AskOutcome = "sent" | "not_found" | "already_requested";

export async function askToJoin(r: { officeId: number; name: string; email: string; phone: string; demo: boolean }, q: Sql = sql()): Promise<AskOutcome> {
  const [office] = await q.query("SELECT 1 FROM offices WHERE id = $1 AND is_demo = $2", [r.officeId, r.demo]);
  if (!office) return "not_found";
  const rows = await q.query(
    `INSERT INTO office_join_requests (office_id, name, email, phone, is_demo, created_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (lower(email), is_demo) WHERE decision = 'pending' DO NOTHING RETURNING id`,
    [r.officeId, r.name, r.email.toLowerCase(), r.phone, r.demo, nowIso()],
  );
  return rows.length ? "sent" : "already_requested";
}

/** Authority view: this world's requests, waiting ones first. */
export function listJoinRequests(demo: boolean, q: Sql = sql()) {
  return q.query<JoinRequest>(`${SELECT} WHERE r.is_demo = $1 ORDER BY (r.decision = 'pending') DESC, r.created_at DESC, r.id DESC`, [demo]);
}

export type DecideOutcome = "approved" | "declined" | "not_found" | "conflict" | "email_taken";

export async function decideJoin(id: number, decision: "approved" | "declined", by: { email: string | null; demo: boolean }): Promise<DecideOutcome> {
  const [row] = await sql().query<JoinRequest>(`${SELECT} WHERE r.id = $1 AND r.is_demo = $2`, [id, by.demo]);
  if (!row) return "not_found";
  if (row.decision !== "pending") return "conflict";
  if (decision === "approved") {
    const added = await addStaff(row.office_id, row.email, by.demo);
    if (added === "not_found") return "not_found";
    if (added === "email_taken") return "email_taken";
  }
  // Only the request still pending is changed, so two Authorities deciding at once cannot both win.
  const changed = await sql().query("UPDATE office_join_requests SET decision = $1, decided_by = $2, decided_at = $3 WHERE id = $4 AND decision = 'pending' RETURNING id", [
    decision,
    by.email,
    nowIso(),
    id,
  ]);
  if (!changed.length) return "conflict";
  if (!by.demo)
    await sendQuietly({
      to: [row.email],
      subject: decision === "approved" ? `You are now staff of ${row.office}` : `Your request to join ${row.office}`,
      body:
        decision === "approved"
          ? `An Authority approved your request. Open INvisible City and reload the page: My Office now shows the jobs assigned to ${row.office}.`
          : `An Authority declined your request to join ${row.office}. If this is a mistake, ask your Office to contact the Authority.`,
    });
  return decision;
}
