import { nowIso, nowMs } from "./clock";
import { closeContractsOfRemoved, emailWithdrawn, type WithdrawnContract } from "./contract-ends";
import { addEvent, duplicateCandidates, NewReport, recentlyResolvedNearby, recordReport } from "./db";
import { haversineMeters } from "./geo";
import { computePriority, findDuplicate, maxSeverity } from "./scoring";
import { Sql, sql } from "./sql";
import { Issue, Severity } from "./types";

/** Reports one Citizen may send in any 24 hours (also applies to Demo accounts). */
export const DAILY_REPORT_LIMIT = 10;

/** Counts every Report the Citizen sent in the last 24 hours, including ones deleted or flagged since. */
export async function reportsInLastDay(personId: string, q: Sql = sql()) {
  const [row] = await q.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM reports WHERE reporter_id = $1 AND created_at > $2",
    [personId, new Date(nowMs() - 86_400_000).toISOString()],
  );
  return row.n;
}

type Draft = Omit<NewReport, "match" | "recurrenceOf">;

/** Duplicate check against open Issues, and whether this Citizen already has a Report on the matched Issue. */
async function checkDuplicate(r: Draft, q: Sql) {
  const match = findDuplicate(await duplicateCandidates(r.isDemo, q), {
    lat: r.lat,
    lng: r.lng,
    category: r.ai.category,
    hash: r.imageHash,
  });
  if (!match) return { match: null, alreadyReported: false };
  const mine = await q.query(
    "SELECT 1 FROM reports WHERE issue_id = $1 AND reporter_id = $2 AND NOT is_spam AND deleted_at IS NULL LIMIT 1",
    [match.issue.id, r.reporterId],
  );
  return { match, alreadyReported: mine.length > 0 };
}

/** Read-only version of the duplicate rule, so a refusal happens before the photo is stored. */
export async function wouldBeAlreadyReported(r: Draft) {
  return (await checkDuplicate(r, sql())).alreadyReported;
}

export type SubmitOutcome =
  | { status: "already_reported" }
  | { status: "daily_limit" }
  | { status: "ok"; issueId: number; match: NewReport["match"]; recurrenceOf: number | null };

/** Duplicate check, recurrence check, then merge or create, all in one transaction. */
export function submitReport(r: Draft): Promise<SubmitOutcome> {
  return sql().tx(async (q) => {
    // Lock this Citizen's row so parallel requests cannot all pass the daily limit.
    await q.query("SELECT 1 FROM people WHERE id = $1 FOR UPDATE", [r.reporterId]);
    if ((await reportsInLastDay(r.reporterId, q)) >= DAILY_REPORT_LIMIT) return { status: "daily_limit" as const };
    const { match, alreadyReported } = await checkDuplicate(r, q);
    if (alreadyReported) return { status: "already_reported" as const };
    // Recurrence: the same problem back where a repair was made recently (same Category, within 60 m).
    const recurrence = match
      ? null
      : ((await recentlyResolvedNearby(r.ai.category, r.isDemo, q)).find((i) => haversineMeters(r.lat, r.lng, i.lat, i.lng) < 60) ?? null);
    const recurrenceOf = recurrence?.id ?? null;
    const issueId = await recordReport({ ...r, match, recurrenceOf }, q);
    return { status: "ok" as const, issueId, match, recurrenceOf };
  });
}

export type DeleteOutcome = "deleted" | "not_found" | "not_open";

/** A Citizen takes back their own Report, but only while its Issue is still Open. */
export async function deleteOwnReport(reportId: number, personId: string): Promise<DeleteOutcome> {
  const out = await sql().tx(async (q) => {
    const [row] = await q.query<{ issue_id: number; status: string }>(
      `SELECT r.issue_id, i.status FROM reports r JOIN issues i ON i.id = r.issue_id
       WHERE r.id = $1 AND r.reporter_id = $2 AND NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL FOR UPDATE OF r, i`,
      [reportId, personId],
    );
    if (!row) return "not_found" as const;
    if (row.status !== "open") return "not_open" as const;
    const now = nowIso();
    await q.query("UPDATE reports SET deleted_at = $1 WHERE id = $2", [now, reportId]);
    return recountIssue(q, row.issue_id, now, "A citizen withdrew their report.");
  });
  if (typeof out === "string") return out;
  for (const c of out.withdrawn) await emailWithdrawn(c);
  return "deleted";
}

/**
 * After a Report is withdrawn or flagged as spam: recount the remaining Reports, recompute severity and
 * priority, show a remaining Report's photo as the cover, and note it on the timeline. With none left the Issue is removed and
 * its contracts close; the caller emails the Businesses of `withdrawn` once the transaction is done.
 */
export async function recountIssue(
  q: Sql,
  issueId: number,
  now: string,
  message: string,
): Promise<{ removed: boolean; withdrawn: WithdrawnContract[] }> {
  const left = await q.query<{ ai_severity: Severity; image: string | null }>(
    "SELECT ai_severity, image FROM reports WHERE issue_id = $1 AND NOT is_spam AND deleted_at IS NULL ORDER BY created_at, id",
    [issueId],
  );
  if (left.length === 0) {
    await q.query("UPDATE issues SET deleted_at = $1, updated_at = $1 WHERE id = $2", [now, issueId]);
    return { removed: true, withdrawn: await closeContractsOfRemoved(q, issueId) };
  }
  const n = left.length;
  const severity = left.map((r) => r.ai_severity).reduce((a, b) => maxSeverity(a, b));
  const [issue] = await q.query<Pick<Issue, "category" | "created_at" | "status" | "recurrence_of">>(
    "SELECT category, created_at, status, recurrence_of FROM issues WHERE id = $1",
    [issueId],
  );
  await q.query("UPDATE issues SET report_count = $1, severity = $2, priority = $3, cover_image = $4, updated_at = $5 WHERE id = $6", [
    n,
    severity,
    computePriority({ ...issue, severity, report_count: n }),
    left.find((r) => r.image)?.image ?? null,
    now,
    issueId,
  ]);
  await addEvent(issueId, "report_removed", `${message} ${n} citizens have now reported this.`, now, q);
  return { removed: false, withdrawn: [] };
}
