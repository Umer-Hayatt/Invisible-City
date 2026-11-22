import { nowIso, nowMs } from "./clock";
import { addEvent, duplicateCandidates, NewReport, recentlyResolvedNearby, recordReport } from "./db";
import { haversineMeters } from "./geo";
import { computePriority, findDuplicate } from "./scoring";
import { Sql, sql } from "./sql";
import { Issue } from "./types";

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
export function deleteOwnReport(reportId: number, personId: string): Promise<DeleteOutcome> {
  return sql().tx(async (q) => {
    const [row] = await q.query<{ issue_id: number; status: string }>(
      `SELECT r.issue_id, i.status FROM reports r JOIN issues i ON i.id = r.issue_id
       WHERE r.id = $1 AND r.reporter_id = $2 AND NOT r.is_spam AND r.deleted_at IS NULL AND i.deleted_at IS NULL`,
      [reportId, personId],
    );
    if (!row) return "not_found";
    if (row.status !== "open") return "not_open";
    const now = nowIso();
    await q.query("UPDATE reports SET deleted_at = $1 WHERE id = $2", [now, reportId]);
    const [{ n }] = await q.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM reports WHERE issue_id = $1 AND NOT is_spam AND deleted_at IS NULL",
      [row.issue_id],
    );
    if (n === 0) {
      // No Reports left: the Issue goes with it.
      await q.query("UPDATE issues SET deleted_at = $1, updated_at = $1 WHERE id = $2", [now, row.issue_id]);
      return "deleted";
    }
    const [issue] = await q.query<Pick<Issue, "severity" | "category" | "created_at" | "status" | "recurrence_of">>("SELECT severity, category, created_at, status, recurrence_of FROM issues WHERE id = $1", [row.issue_id]);
    await q.query("UPDATE issues SET report_count = $1, priority = $2, updated_at = $3 WHERE id = $4", [
      n,
      computePriority({ ...issue, report_count: n }),
      now,
      row.issue_id,
    ]);
    await addEvent(row.issue_id, "report_removed", `A citizen withdrew their report. ${n} citizens have now reported this.`, now, q);
    return "deleted";
  });
}
