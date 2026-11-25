import { nowIso } from "./clock";
import { closeOverdueFixes, emailReporters } from "./closure";
import { reopenIssue } from "./contract-ends";
import type { Actor } from "./roles";
import { Sql, sql } from "./sql";

/**
 * The Office's work and the Citizen's answer: the rows of the Issue state machine after Assignment.
 *
 *   Assigned    --start work-------> In progress   (Office staff of that Office)
 *   Assigned    --send back(reason)-> Open          (Office staff of that Office; Office cleared)
 *   In progress --record Fix-------> Fixed         (Office staff of that Office; reporters emailed)
 *   Fixed       --confirm----------> Resolved      (a Citizen who reported it; reporters emailed)
 *   Fixed       --reject(comment)--> In progress   (a Citizen who reported it; after-photo cleared)
 *                                 -> Open          (the same, when the Office was revoked since its Fix; Office cleared)
 *   Fixed, 7 days later -----------> Closed unconfirmed (lib/closure.ts)
 *
 * Who may act is checked before the state: someone who may never act on this Issue gets "forbidden",
 * the right person at the wrong moment gets "conflict", and nothing changes in either case.
 */
export type Outcome = "ok" | "not_found" | "forbidden" | "conflict";

export interface IssueRow {
  id: number;
  status: string;
  office_id: number | null;
  office_name: string | null;
  title: string;
  is_demo: boolean;
}

type Command = "start" | "send_back" | "fix" | "confirm" | "reject";

const FROM: Record<Command, string> = {
  start: "assigned",
  send_back: "assigned",
  fix: "in_progress",
  confirm: "fixed",
  reject: "fixed",
};

async function check(q: Sql, actor: Actor, issueId: number, command: Command, lock: boolean) {
  const [row] = await q.query<IssueRow>(
    `SELECT i.id, i.status, i.office_id, o.name AS office_name, i.title, i.is_demo
     FROM issues i LEFT JOIN offices o ON o.id = i.office_id
     WHERE i.id = $1 AND i.deleted_at IS NULL AND i.is_demo = $2 ${lock ? "FOR UPDATE OF i" : ""}`,
    [issueId, actor.isDemo],
  );
  if (!row) return { outcome: "not_found" as const };
  if (command === "confirm" || command === "reject") {
    const mine = await q.query(
      "SELECT 1 FROM reports WHERE issue_id = $1 AND reporter_id = $2 AND NOT is_spam AND deleted_at IS NULL LIMIT 1",
      [issueId, actor.personId],
    );
    if (mine.length === 0) return { outcome: "forbidden" as const };
  } else if (actor.officeId === null || row.office_id !== actor.officeId) {
    return { outcome: "forbidden" as const };
  }
  if (row.status !== FROM[command]) return { outcome: "conflict" as const };
  return { outcome: "ok" as const, row };
}

/** Read-only check, so a refused Fix is answered before its photo is uploaded. */
export async function canRun(actor: Actor, issueId: number, command: Command): Promise<Outcome> {
  await closeOverdueFixes();
  return (await check(sql(), actor, issueId, command, false)).outcome;
}

/** Runs one command: overdue Fixes are closed first, then the check and the change happen in one transaction. */
async function run(actor: Actor, issueId: number, command: Command, apply: (q: Sql, row: IssueRow, now: string) => Promise<void>) {
  await closeOverdueFixes();
  return sql().tx(async (q) => {
    const c = await check(q, actor, issueId, command, true);
    if (c.outcome !== "ok") return { outcome: c.outcome, row: null };
    await apply(q, c.row, nowIso());
    return { outcome: "ok" as const, row: c.row };
  });
}

function event(q: Sql, row: IssueRow, kind: string, message: string, role: string, at: string) {
  return q.query("INSERT INTO events (issue_id, kind, message, actor_role, created_at, office_id) VALUES ($1, $2, $3, $4, $5, $6)", [
    row.id,
    kind,
    message,
    role,
    at,
    row.office_id,
  ]);
}

export async function startWork(actor: Actor, issueId: number): Promise<Outcome> {
  const { outcome } = await run(actor, issueId, "start", async (q, row, now) => {
    await q.query("UPDATE issues SET status = 'in_progress', updated_at = $1 WHERE id = $2", [now, issueId]);
    await event(q, row, "in_progress", `Work started by ${row.office_name}`, "office", now);
  });
  return outcome;
}

export async function sendBack(actor: Actor, issueId: number, reason: string): Promise<Outcome> {
  const { outcome } = await run(actor, issueId, "send_back", async (q, row, now) => {
    await reopenIssue(q, issueId);
    await event(q, row, "sent_back", `Sent back by ${row.office_name}: ${reason}`, "office", now);
  });
  return outcome;
}

export async function recordFix(actor: Actor, issueId: number, afterImage: string, note: string): Promise<Outcome> {
  const { outcome, row: done } = await run(actor, issueId, "fix", async (q, row, now) => {
    await q.query(
      `UPDATE issues SET status = 'fixed', after_image = $1, fix_note = $2, fixed_at = $3, updated_at = $3 WHERE id = $4`,
      [afterImage, note || null, now, issueId],
    );
    await event(q, row, "fixed", `Fixed by ${row.office_name}${note ? `: ${note}` : ""}. After-repair photo added.`, "office", now);
  });
  if (done) await emailReporters(done, "fixed");
  return outcome;
}

export async function confirmFix(actor: Actor, issueId: number): Promise<Outcome> {
  const { outcome, row: done } = await run(actor, issueId, "confirm", async (q, row, now) => {
    await q.query(
      "UPDATE issues SET status = 'resolved', resolved_at = $1, resolution_note = fix_note, updated_at = $1 WHERE id = $2",
      [now, issueId],
    );
    await event(q, row, "resolved", "Resolved: a Citizen who reported this confirmed the Fix.", "citizen", now);
  });
  if (done) await emailReporters(done, "resolved");
  return outcome;
}

export async function rejectFix(actor: Actor, issueId: number, comment: string): Promise<Outcome> {
  const { outcome } = await run(actor, issueId, "reject", async (q, row, now) => {
    await q.query(
      `UPDATE issues SET status = 'in_progress', after_image = NULL, fix_note = NULL, fixed_at = NULL, updated_at = $1
       WHERE id = $2`,
      [now, issueId],
    );
    await event(q, row, "rejected", `Fix rejected by a Citizen who reported this: ${comment}`, "citizen", now);
    // Nobody can sign in as a revoked Business to repair it again. FOR SHARE waits out a Revocation in progress.
    const [office] = await q.query<{ revoked_at: string | null }>("SELECT revoked_at FROM offices WHERE id = $1 FOR SHARE", [row.office_id]);
    if (office?.revoked_at) {
      await reopenIssue(q, issueId);
      await event(q, row, "sent_back", `Back to Open: ${row.office_name} no longer works with the city`, "system", now);
    }
  });
  return outcome;
}

/** The API answer for an outcome. */
export function outcomeResponse(outcome: Outcome) {
  if (outcome === "ok") return Response.json({ ok: true });
  const status = { not_found: 404, forbidden: 403, conflict: 409 }[outcome];
  return Response.json({ error: outcome }, { status });
}

/** Trimmed free text between 2 and `max` characters, or null. */
export function cleanText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length >= 2 && s.length <= max ? s : null;
}
