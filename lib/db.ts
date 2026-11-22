import { nowIso, nowMs } from "./clock";
import { haversineMeters } from "./geo";
import { computePriority, DuplicateMatch, maxSeverity } from "./scoring";
import { Sql, sql } from "./sql";
import { Category, Issue, IssueEvent, Report, Severity } from "./types";

// ---------------------------------------------------------------------------
// Reads. Reporter identity never leaves this module in a public shape: Reports
// come back without name, email or phone (the Authority and Office views, which
// may see contact details, arrive with sign-in).
// ---------------------------------------------------------------------------
const ISSUE_SELECT = `
  SELECT i.id, i.category, i.severity, i.title, i.summary, i.lat, i.lng, i.neighborhood, i.constituency,
         i.status, i.priority, i.office_id, o.name AS assigned_team, d.name AS department,
         i.report_count, i.cover_image, i.after_image, i.resolution_note, i.recurrence_of,
         i.created_at, i.updated_at, i.resolved_at
  FROM issues i
  JOIN categories c ON c.key = i.category
  JOIN departments d ON d.id = c.department_id
  LEFT JOIN offices o ON o.id = i.office_id
  WHERE i.deleted_at IS NULL AND i.is_demo = $1`;

function withLivePriority(i: Issue): Issue {
  return { ...i, priority: computePriority(i) };
}

/** Every read takes `demo`: a Demo account sees Demo data only, a real account sees real data only. */
export async function listIssues(
  demo: boolean,
  filter: { status?: string; category?: string; neighborhood?: string } = {},
  q: Sql = sql(),
) {
  const where: string[] = [];
  const params: unknown[] = [demo];
  if (filter.status === "unresolved") where.push("i.status NOT IN ('resolved', 'closed_unconfirmed')");
  else if (filter.status) where.push(`i.status = $${params.push(filter.status)}`);
  if (filter.category) where.push(`i.category = $${params.push(filter.category)}`);
  if (filter.neighborhood) where.push(`i.neighborhood = $${params.push(filter.neighborhood)}`);
  const rows = await q.query<Issue>(`${ISSUE_SELECT} ${where.map((w) => "AND " + w).join(" ")}`, params);
  return rows.map(withLivePriority).sort((a, b) => b.priority - a.priority || b.id - a.id);
}

export async function getIssue(id: number, demo: boolean, q: Sql = sql()) {
  if (!Number.isInteger(id)) return null;
  const [issue] = await q.query<Issue>(`${ISSUE_SELECT} AND i.id = $2`, [demo, id]);
  if (!issue) return null;
  const reports = await q.query<Report>(
    `SELECT id, issue_id, NULL::text AS reporter_name, description, image, image_hash, lat, lng, ai_category,
            ai_severity, ai_confidence, ai_summary, ai_source, duplicate_score, created_at
     FROM reports WHERE issue_id = $1 AND NOT is_spam AND deleted_at IS NULL ORDER BY created_at ASC, id ASC`,
    [id],
  );
  const events = await q.query<IssueEvent>(
    "SELECT id, issue_id, kind, message, created_at FROM events WHERE issue_id = $1 ORDER BY created_at ASC, id ASC",
    [id],
  );
  return { issue: withLivePriority(issue), reports, events };
}

/** Open Issues with the image hashes of their Reports, for duplicate detection. */
export async function duplicateCandidates(demo: boolean, q: Sql = sql()) {
  const issues = await q.query<Issue>(`${ISSUE_SELECT} AND i.status NOT IN ('resolved', 'closed_unconfirmed')`, [demo]);
  const hashRows = await q.query<{ issue_id: number; image_hash: string }>(
    "SELECT issue_id, image_hash FROM reports WHERE image_hash IS NOT NULL AND NOT is_spam AND deleted_at IS NULL",
  );
  const byIssue = new Map<number, string[]>();
  for (const r of hashRows) byIssue.set(r.issue_id, [...(byIssue.get(r.issue_id) ?? []), r.image_hash]);
  return issues.map((i) => ({ ...i, hashes: byIssue.get(i.id) ?? [] }));
}

export function recentlyResolvedNearby(category: Category, demo: boolean, q: Sql = sql()) {
  return q.query<Issue>(`${ISSUE_SELECT} AND i.status = 'resolved' AND i.category = $2 AND i.resolved_at > $3`, [
    demo,
    category,
    new Date(nowMs() - 180 * 86_400_000).toISOString(),
  ]);
}

export function reportsByReporter(authId: string, q: Sql = sql()) {
  return q.query(
    `SELECT r.id, r.issue_id, NULL::text AS reporter_name, r.description, r.image, r.lat, r.lng, r.ai_category,
            r.ai_severity, r.ai_confidence, r.ai_summary, r.ai_source, r.duplicate_score, r.created_at,
            i.status AS issue_status, i.title AS issue_title, i.report_count AS issue_report_count,
            i.after_image AS issue_after_image, o.name AS issue_team, i.neighborhood AS issue_neighborhood
     FROM reports r
     JOIN people p ON p.id = r.reporter_id
     JOIN issues i ON i.id = r.issue_id
     LEFT JOIN offices o ON o.id = i.office_id
     WHERE p.auth_id = $1 AND NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL
     ORDER BY r.created_at DESC`,
    [authId],
  );
}

export function addEvent(issueId: number, kind: string, message: string, at = nowIso(), q: Sql = sql()) {
  return q.query("INSERT INTO events (issue_id, kind, message, created_at) VALUES ($1, $2, $3, $4)", [
    issueId,
    kind,
    message,
    at,
  ]);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewReport {
  reporterId: string; // people.id of the signed-in Citizen
  isDemo: boolean;
  description: string;
  image: string | null;
  imageHash: string | null;
  lat: number;
  lng: number;
  neighborhood: string;
  constituency: string | null;
  ai: {
    category: Category;
    severity: Severity;
    confidence: number;
    title: string;
    summary: string;
    source: string;
  };
  categoryLabel: string;
  match: DuplicateMatch | null;
  recurrenceOf: number | null;
}

/** Merges into the matched Issue or creates a new one, then stores the Report, in one transaction. */
export function recordReport(r: NewReport, outer?: Sql) {
  const run = <T>(f: (q: Sql) => Promise<T>) => (outer ? f(outer) : sql().tx(f)); return run(async (q) => {
    const now = nowIso();
    let id: number;
    if (r.match) {
      const issue = r.match.issue;
      const severity = maxSeverity(issue.severity, r.ai.severity);
      const reportCount = issue.report_count + 1;
      await q.query(
        `UPDATE issues SET severity = $1, report_count = $2, cover_image = COALESCE(cover_image, $3),
         priority = $4, updated_at = $5 WHERE id = $6`,
        [
          severity,
          reportCount,
          r.image,
          computePriority({ ...issue, severity, report_count: reportCount }),
          now,
          issue.id,
        ],
      );
      id = issue.id;
      await addEvent(
        id,
        "merged",
        `New report grouped as duplicate (match ${Math.round(r.match.score * 100)}%, ${r.match.distance} m away). ${reportCount} citizens have now reported this.`,
        now,
        q,
      );
      if (severity !== issue.severity) await addEvent(id, "escalated", `Severity raised to ${severity}`, now, q);
    } else {
      const priority = computePriority({
        severity: r.ai.severity,
        category: r.ai.category,
        report_count: 1,
        created_at: now,
        status: "open",
        recurrence_of: r.recurrenceOf,
      });
      const [row] = await q.query<{ id: number }>(
        `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, constituency, status, priority,
           report_count, cover_image, recurrence_of, is_demo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, 1, $10, $11, $12, $13, $13) RETURNING id`,
        [
          r.ai.category,
          r.ai.severity,
          r.ai.title,
          r.ai.summary,
          r.lat,
          r.lng,
          r.neighborhood,
          r.constituency,
          priority,
          r.image,
          r.recurrenceOf,
          r.isDemo,
          now,
        ],
      );
      id = row.id;
      await addEvent(
        id,
        "created",
        `Reported in ${r.neighborhood}. AI classified as ${r.categoryLabel} (${r.ai.severity}, ${Math.round(
          r.ai.confidence * 100,
        )}% confidence).`,
        now,
        q,
      );
      if (r.recurrenceOf)
        await addEvent(id, "recurring", `Recurring problem: issue #${r.recurrenceOf} here was repaired before`, now, q);
    }
    await q.query(
      `INSERT INTO reports (issue_id, reporter_id, description, image, image_hash, lat, lng, ai_category,
         ai_severity, ai_confidence, ai_summary, ai_source, duplicate_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        r.reporterId,
        r.description,
        r.image,
        r.imageHash,
        r.lat,
        r.lng,
        r.ai.category,
        r.ai.severity,
        r.ai.confidence,
        r.ai.summary,
        r.ai.source,
        r.match?.score ?? null,
        now,
      ],
    );
    return id;
  });
}

/** Nearest Office of a Department to a point, or null if the Department has none. */
export async function nearestOffice(department: string, lat: number, lng: number, demo: boolean, q: Sql = sql()) {
  const offices = await q.query<{ id: number; name: string; lat: number; lng: number }>(
    `SELECT o.id, o.name, o.lat, o.lng FROM offices o JOIN departments d ON d.id = o.department_id WHERE d.name = $1 AND o.is_demo = $2`,
    [department, demo],
  );
  offices.sort((a, b) => haversineMeters(lat, lng, a.lat, a.lng) - haversineMeters(lat, lng, b.lat, b.lng));
  return offices[0] ?? null;
}

export async function setAssignment(issueId: number, officeId: number | null, status: string, q: Sql = sql()) {
  await q.query(
    `UPDATE issues SET office_id = $1, status = $2, updated_at = $3,
       resolved_at = CASE WHEN $2 = 'resolved' THEN resolved_at ELSE NULL END WHERE id = $4`,
    [officeId, status, nowIso(), issueId],
  );
}

export async function markResolved(issueId: number, afterImage: string | null, note: string, q: Sql = sql()) {
  const now = nowIso();
  await q.query(
    `UPDATE issues SET status = 'resolved', after_image = $1, resolution_note = $2, resolved_at = $3, updated_at = $3
     WHERE id = $4`,
    [afterImage, note, now, issueId],
  );
  return now;
}
