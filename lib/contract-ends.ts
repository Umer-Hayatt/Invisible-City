import { nowIso } from "./clock";
import { setAssignment } from "./db";
import { sendQuietly } from "./mailer";
import type { Sql } from "./sql";

/**
 * How contracts stop when the Issue changes under them (the Authority's and the Business's own answers are in
 * lib/contracts.ts). An accepted contract ends when its Issue leaves the Business: sent back, reopened by a Revocation,
 * or removed. A waiting one is withdrawn when its Issue is removed. Everything here runs inside the caller's transaction
 * except the email.
 */

/** The Issue goes back to Open with no Business, and the accepted contract that gave it one ends. */
export async function reopenIssue(q: Sql, issueId: number) {
  await setAssignment(issueId, null, "open", q);
  await endAccepted(q, issueId);
}

function endAccepted(q: Sql, issueId: number) {
  return q.query("UPDATE contracts SET status = 'ended', ended_at = $1 WHERE issue_id = $2 AND status = 'accepted'", [nowIso(), issueId]);
}

export interface WithdrawnContract {
  title: string;
  office: string;
  emails: string[];
}

/** The Issue is removed: its accepted contract ends and its waiting one is withdrawn and returned, to email the Business. */
export async function closeContractsOfRemoved(q: Sql, issueId: number): Promise<WithdrawnContract[]> {
  await endAccepted(q, issueId);
  const done = await q.query<{ office_id: number; title: string; office: string; is_demo: boolean }>(
    `UPDATE contracts c SET status = 'withdrawn', decided_at = $1 FROM issues i, offices o
     WHERE c.issue_id = $2 AND c.status = 'sent' AND i.id = c.issue_id AND o.id = c.office_id
     RETURNING c.office_id, i.title, o.name AS office, i.is_demo`,
    [nowIso(), issueId],
  );
  const out: WithdrawnContract[] = [];
  for (const c of done) {
    if (c.is_demo) continue; // the Demo never sends email
    const staff = await q.query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [c.office_id]);
    out.push({ title: c.title, office: c.office, emails: staff.map((s) => s.email) });
  }
  return out;
}

/** Tells a Business its waiting contract is gone. Call after the transaction. */
export function emailWithdrawn(c: WithdrawnContract) {
  return sendQuietly({
    to: c.emails,
    subject: `Contract withdrawn: ${c.title}`,
    body: `The city has withdrawn the contract it offered ${c.office} for "${c.title}". There is nothing to answer.`,
  });
}
