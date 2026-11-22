import { nowMs } from "./clock";
import { Mail, sendQuietly } from "./mailer";
import { Sql, sql } from "./sql";

/** Days a Citizen has to confirm or reject a Fix before the Issue closes as unconfirmed. */
export const FIX_ANSWER_DAYS = 7;
const DAY_MS = 86_400_000;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** Emails of the Citizens whose Reports on this Issue still count (not flagged as spam, not withdrawn). */
export async function reporterEmails(issueId: number, q: Sql = sql()) {
  const rows = await q.query<{ email: string }>(
    `SELECT DISTINCT p.email FROM reports r JOIN people p ON p.id = r.reporter_id
     WHERE r.issue_id = $1 AND NOT r.is_spam AND r.deleted_at IS NULL AND p.email IS NOT NULL`,
    [issueId],
  );
  return rows.map((r) => r.email);
}

/** The three emails to reporting Citizens. Demo Issues never send real email. */
export async function emailReporters(
  issue: { id: number; title: string; is_demo: boolean },
  kind: "fixed" | "resolved" | "closed_unconfirmed",
  q: Sql = sql(),
) {
  if (issue.is_demo) return;
  const link = `${siteUrl()}/issues/${issue.id}`;
  const mail: Record<typeof kind, Omit<Mail, "to">> = {
    fixed: {
      subject: `Fixed: ${issue.title}. Is it really fixed?`,
      body: [
        `The Office working on an Issue you reported says it is fixed: ${issue.title}.`,
        "",
        `Please look at the after-repair photo and confirm the Fix, or reject it with a comment if the problem is still there.`,
        `Open My reports: ${siteUrl()}/track`,
        "",
        `If nobody answers within ${FIX_ANSWER_DAYS} days, the Issue is closed as unconfirmed.`,
      ].join("\n"),
    },
    resolved: {
      subject: `Resolved: ${issue.title}`,
      body: [`A Citizen who reported this Issue confirmed the Fix, so it is now Resolved: ${issue.title}.`, "", link].join("\n"),
    },
    closed_unconfirmed: {
      subject: `Closed without confirmation: ${issue.title}`,
      body: [
        `Nobody confirmed or rejected the Fix within ${FIX_ANSWER_DAYS} days, so this Issue is closed as unconfirmed: ${issue.title}.`,
        "It is recorded separately from a confirmed Resolution.",
        "",
        link,
      ].join("\n"),
    },
  };
  await sendQuietly({ to: await reporterEmails(issue.id, q), ...mail[kind] });
}

/**
 * Closes every Fix nobody answered within 7 days, as Closed unconfirmed. Called whenever Issues are read
 * (and before any command on an Issue), so it needs no background worker. The UPDATE claims each row once,
 * so two readers never close or email the same Issue twice. closed_at is the moment the 7 days ran out.
 */
export async function closeOverdueFixes(q: Sql = sql()) {
  const cutoff = new Date(nowMs() - FIX_ANSWER_DAYS * DAY_MS).toISOString();
  const closed = await q.query<{ id: number; title: string; is_demo: boolean; closed_at: string }>(
    `UPDATE issues SET status = 'closed_unconfirmed',
       closed_at = fixed_at + interval '${FIX_ANSWER_DAYS} days', updated_at = fixed_at + interval '${FIX_ANSWER_DAYS} days'
     WHERE status = 'fixed' AND fixed_at <= $1 AND deleted_at IS NULL
     RETURNING id, title, is_demo, closed_at`,
    [cutoff],
  );
  for (const i of closed) {
    await q.query(
      "INSERT INTO events (issue_id, kind, message, actor_role, created_at) VALUES ($1, 'closed_unconfirmed', $2, 'system', $3)",
      [i.id, `Closed unconfirmed: no Citizen confirmed or rejected the Fix within ${FIX_ANSWER_DAYS} days.`, i.closed_at],
    );
    await emailReporters(i, "closed_unconfirmed", q);
  }
  return closed.length;
}
