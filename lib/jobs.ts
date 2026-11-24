import { nowIso } from "./clock";
import { sendQuietly } from "./mailer";
import { Sql, sql } from "./sql";
import type { Actor } from "./roles";

/**
 * Jobs between Authorities and Businesses: a Business sees the Open Issues of its own Department in its own sector,
 * asks for one (a Job request), and talks it over with the Authorities of that area in a chat per Issue. The Authority
 * then assigns the Issue as before; assigning accepts that Business's request and declines the others.
 */

interface BusinessScope {
  id: number;
  name: string;
  department_id: number;
  sector: string;
  is_demo: boolean;
}

async function scopeOf(officeId: number, q: Sql = sql()) {
  const [o] = await q.query<BusinessScope>(
    "SELECT id, name, department_id, sector, is_demo FROM offices WHERE id = $1 AND revoked_at IS NULL",
    [officeId],
  );
  return o ?? null;
}

export interface AvailableJob {
  id: number;
  title: string;
  category: string;
  severity: string;
  neighborhood: string;
  report_count: number;
  cover_image: string | null;
  created_at: string;
  /** This Business's latest request for the Issue, if any. */
  request: "pending" | "accepted" | "declined" | null;
}

const AVAILABLE = `SELECT i.id, i.title, i.category, i.severity, i.neighborhood, i.report_count, i.cover_image, i.created_at,
         (SELECT r.status FROM job_requests r WHERE r.issue_id = i.id AND r.office_id = $1 ORDER BY r.id DESC LIMIT 1) AS request
  FROM issues i JOIN categories c ON c.key = i.category
  WHERE i.status = 'open' AND i.deleted_at IS NULL AND i.is_demo = $2 AND i.neighborhood = $3 AND c.department_id = $4`;

/** Open Issues a Business could take: its Department's kinds of problem, in its sector, not yet assigned. */
export async function availableJobs(officeId: number) {
  const o = await scopeOf(officeId);
  if (!o) return [];
  return sql().query<AvailableJob>(`${AVAILABLE} ORDER BY i.priority DESC, i.id DESC`, [o.id, o.is_demo, o.sector, o.department_id]);
}

export type RequestOutcome = "requested" | "not_available" | "already_requested";

/** A Business asks for an Open Issue it could take. The Authorities of the area are emailed. */
export async function requestJob(officeId: number, issueId: number, note: string): Promise<RequestOutcome> {
  const o = await scopeOf(officeId);
  if (!o) return "not_available";
  const [job] = await sql().query<{ id: number; title: string; neighborhood: string }>(`${AVAILABLE} AND i.id = $5`, [
    o.id,
    o.is_demo,
    o.sector,
    o.department_id,
    issueId,
  ]);
  if (!job) return "not_available";
  const [pending] = await sql().query("SELECT 1 FROM job_requests WHERE issue_id = $1 AND office_id = $2 AND status = 'pending'", [
    issueId,
    officeId,
  ]);
  if (pending) return "already_requested";
  await sql().query("INSERT INTO job_requests (issue_id, office_id, note, created_at) VALUES ($1, $2, $3, $4)", [
    issueId,
    officeId,
    note || null,
    nowIso(),
  ]);
  if (!o.is_demo) {
    const to = (await areaAuthorities(job.neighborhood, false)).map((a) => a.email);
    await sendQuietly({
      to,
      subject: `${o.name} asks for a job: ${job.title}`,
      body: [
        `${o.name} would like to fix this Issue in ${job.neighborhood}.`,
        ...(note ? [`Their note: ${note}`] : []),
        "",
        `Open Job requests in Invisible City to assign it, talk to them, or call them.`,
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/requests`,
      ].join("\n"),
    });
  }
  return "requested";
}

/** The Authorities who work for an area: those of that sector, or the whole-city ones when the sector has none. */
export async function areaAuthorities(area: string, demo: boolean) {
  const rows = await sql().query<{ email: string; name: string; phone: string | null; area: string | null }>(
    `SELECT DISTINCT ON (lower(official_email)) lower(official_email) AS email, name, phone, area
     FROM access_requests WHERE decision = 'approved' AND revoked_at IS NULL AND is_demo = $1 AND (area = $2 OR area IS NULL)
     ORDER BY lower(official_email), decided_at DESC NULLS LAST, id DESC`,
    [demo, area],
  );
  const local = rows.filter((r) => r.area === area);
  return local.length ? local : rows;
}

export interface JobRequestRow {
  id: number;
  issue_id: number;
  title: string;
  category: string;
  severity: string;
  neighborhood: string;
  issue_status: string;
  office_id: number;
  office: string;
  department: string;
  is_private: boolean;
  workers: number;
  active: number;
  phone: string | null;
  email: string | null;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

/** Job requests an Authority may decide: their area's (every area's for a whole-city Authority), waiting first. */
export async function listJobRequests(demo: boolean, area: string | null) {
  return sql().query<JobRequestRow>(
    `SELECT r.id, r.issue_id, i.title, i.category, i.severity, i.neighborhood, i.status AS issue_status,
            o.id AS office_id, o.name AS office, d.name AS department, o.is_private, o.workers, o.phone,
            (SELECT s.email FROM office_staff s WHERE s.office_id = o.id ORDER BY s.id LIMIT 1) AS email,
            (SELECT COUNT(*) FROM issues x WHERE x.office_id = o.id AND x.deleted_at IS NULL
               AND x.status IN ('assigned', 'in_progress'))::int AS active,
            r.note, r.status, r.created_at
     FROM job_requests r JOIN issues i ON i.id = r.issue_id JOIN offices o ON o.id = r.office_id
     JOIN departments d ON d.id = o.department_id
     WHERE i.is_demo = $1 AND i.deleted_at IS NULL AND o.revoked_at IS NULL AND ($2::text IS NULL OR i.neighborhood = $2)
     ORDER BY (r.status = 'pending') DESC, r.created_at DESC, r.id DESC LIMIT 100`,
    [demo, area],
  );
}

/** An Authority turns a request down. Only a waiting request of their area. */
export async function declineJobRequest(id: number, demo: boolean, area: string | null) {
  const rows = await sql().query(
    `UPDATE job_requests r SET status = 'declined', decided_at = $1 FROM issues i
     WHERE r.id = $2 AND i.id = r.issue_id AND r.status = 'pending' AND i.is_demo = $3 AND ($4::text IS NULL OR i.neighborhood = $4)
     RETURNING r.id`,
    [nowIso(), id, demo, area],
  );
  return rows.length > 0;
}

/** Inside an Assignment: the chosen Business's request is accepted, every other waiting one declined. */
export async function settleJobRequests(issueId: number, officeId: number, q: Sql) {
  await q.query(
    `UPDATE job_requests SET status = CASE WHEN office_id = $2 THEN 'accepted' ELSE 'declined' END, decided_at = $3
     WHERE issue_id = $1 AND status = 'pending'`,
    [issueId, officeId, nowIso()],
  );
}

// --- chat ---------------------------------------------------------------------------------------------------------

export interface ChatMessage {
  id: number;
  sender_role: "authority" | "office";
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface ThreadScope {
  issueId: number;
  officeId: number;
  title: string;
  neighborhood: string;
  office: string;
}

/**
 * Who may read and write the chat of an Issue with a Business: an Authority of the Issue's area, or that Business
 * when the Issue is one it could take, asked for, or was given. Returns the thread, or null when not allowed.
 */
export async function chatScope(actor: Actor, issueId: number, officeId: number): Promise<ThreadScope | null> {
  if (actor.role === "office" && actor.officeId !== officeId) return null;
  if (actor.role !== "office" && actor.role !== "authority") return null;
  const o = await scopeOf(officeId);
  if (!o || o.is_demo !== actor.isDemo) return null;
  const [i] = await sql().query<{ title: string; neighborhood: string; office_id: number | null; department_id: number; status: string }>(
    `SELECT i.title, i.neighborhood, i.office_id, c.department_id, i.status FROM issues i JOIN categories c ON c.key = i.category
     WHERE i.id = $1 AND i.deleted_at IS NULL AND i.is_demo = $2`,
    [issueId, actor.isDemo],
  );
  if (!i) return null;
  if (actor.role === "authority" && actor.area && i.neighborhood !== actor.area) return null;
  if (actor.role === "office") {
    const [asked] = await sql().query("SELECT 1 FROM job_requests WHERE issue_id = $1 AND office_id = $2", [issueId, officeId]);
    const couldTake = i.status === "open" && i.neighborhood === o.sector && i.department_id === o.department_id;
    if (!asked && i.office_id !== officeId && !couldTake) return null;
  }
  return { issueId, officeId, title: i.title, neighborhood: i.neighborhood, office: o.name };
}

export function listMessages(issueId: number, officeId: number) {
  return sql().query<ChatMessage>(
    "SELECT id, sender_role, sender_name, body, created_at FROM job_messages WHERE issue_id = $1 AND office_id = $2 ORDER BY created_at, id",
    [issueId, officeId],
  );
}

export async function postMessage(actor: Actor, t: ThreadScope, body: string) {
  const name = actor.role === "office" ? t.office : actor.displayName || "Authority";
  const [m] = await sql().query<ChatMessage>(
    `INSERT INTO job_messages (issue_id, office_id, sender_role, sender_name, body, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, sender_role, sender_name, body, created_at`,
    [t.issueId, t.officeId, actor.role, name, body, nowIso()],
  );
  return m;
}

/** Who the other side is and how to call them. Phones go only to officials of the same job, never to Citizens. */
export async function chatContacts(actor: Actor, t: ThreadScope) {
  if (actor.role === "authority") {
    const [o] = await sql().query<{ name: string; phone: string | null; email: string | null }>(
      `SELECT o.name, o.phone, (SELECT s.email FROM office_staff s WHERE s.office_id = o.id ORDER BY s.id LIMIT 1) AS email
       FROM offices o WHERE o.id = $1`,
      [t.officeId],
    );
    return [{ name: o.name, phone: o.phone, email: o.email }];
  }
  return (await areaAuthorities(t.neighborhood, actor.isDemo)).map((a) => ({ name: a.name, phone: a.phone, email: a.email }));
}
