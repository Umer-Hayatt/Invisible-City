import { suggestedOffices } from "./authority";
import { nowIso, nowMs } from "./clock";
import { addEvent, setAssignment } from "./db";
import { areaAuthorities, settleJobRequests } from "./jobs";
import { sendQuietly } from "./mailer";
import type { Actor } from "./roles";
import { Sql, sql } from "./sql";
import { cleanText } from "./workflow";

/**
 * Assignment by agreement. An Authority sends a Business a contract for an Open Issue; the Issue stays Open until the
 * Business accepts, and accepting is the only way an Issue is ever Assigned.
 *
 *   (none)  --send-----> sent       (Authority of the Issue's area; one contract waiting per Issue)
 *   sent    --accept---> accepted   (that Business; the Issue becomes Assigned to it)
 *   sent    --decline--> declined   (that Business, with a reason; the Issue stays Open)
 *   sent    --withdraw-> withdrawn  (Authority of the Issue's area; the Issue stays Open)
 */
export interface Terms {
  scope: string;
  pricePkr: number | null;
  startDate: string | null;
  finishDate: string;
  paymentTerms: string | null;
}

export type TermsError = "invalid_scope" | "invalid_price" | "invalid_dates" | "invalid_payment_terms";

const MAX_PRICE = 1_000_000_000;
/** Today's date in Islamabad (UTC+5, no daylight saving), as YYYY-MM-DD. */
const today = () => new Date(nowMs() + 5 * 3_600_000).toISOString().slice(0, 10);
const isDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().startsWith(v);
const blank = (v: unknown) => v === undefined || v === null || v === "";

/** The terms as sent by the form, or why they are not acceptable. Price, start and payment terms may be left out. */
export function parseTerms(b: Record<string, unknown>): Terms | TermsError {
  const scope = cleanText(b.scope, 2000);
  if (!scope) return "invalid_scope";
  const pricePkr = blank(b.pricePkr) ? null : Number(b.pricePkr);
  if (pricePkr !== null && (!Number.isInteger(pricePkr) || pricePkr < 0 || pricePkr > MAX_PRICE)) return "invalid_price";
  const startDate = blank(b.startDate) ? null : b.startDate;
  if (startDate !== null && !isDate(startDate)) return "invalid_dates";
  if (!isDate(b.finishDate) || b.finishDate < today() || (startDate !== null && b.finishDate < startDate)) return "invalid_dates";
  const paymentTerms = blank(b.paymentTerms) ? null : cleanText(b.paymentTerms, 500);
  if (!blank(b.paymentTerms) && !paymentTerms) return "invalid_payment_terms";
  return { scope, pricePkr, startDate, finishDate: b.finishDate, paymentTerms };
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";
const staffEmails = async (officeId: number) =>
  (await sql().query<{ email: string }>("SELECT email FROM office_staff WHERE office_id = $1", [officeId])).map((s) => s.email);

function termLines(t: Terms) {
  return [
    `Work: ${t.scope}`,
    `Price: ${t.pricePkr === null ? "not stated" : `PKR ${t.pricePkr.toLocaleString("en-US")}`}`,
    ...(t.startDate ? [`Start: ${t.startDate}`] : []),
    `Finish by: ${t.finishDate}`,
    ...(t.paymentTerms ? [`Payment: ${t.paymentTerms}`] : []),
  ];
}

export type SendOutcome =
  | { status: "sent"; id: number }
  | { status: "not_found" | "out_of_area" | "invalid_office" | "no_business_email" | "conflict" | "contract_waiting" };

/** An Authority sends a contract for an Open Issue to one of the suggested Businesses, which is emailed. */
export async function sendContract(actor: Actor, issueId: number, officeId: number, terms: Terms): Promise<SendOutcome> {
  const offices = await suggestedOffices(issueId, actor.isDemo);
  if (!offices) return { status: "not_found" };
  if (actor.area) {
    const [issue] = await sql().query<{ neighborhood: string }>("SELECT neighborhood FROM issues WHERE id = $1", [issueId]);
    if (issue?.neighborhood !== actor.area) return { status: "out_of_area" };
  }
  const office = offices.find((o) => o.id === officeId);
  if (!office) return { status: "invalid_office" };
  // Nobody could accept it. (In the Demo most Businesses are scenery without an account.)
  if (!office.has_email && !actor.isDemo) return { status: "no_business_email" };

  const result = await sql().tx(async (q) => {
    const [issue] = await q.query<{ status: string; title: string; neighborhood: string; severity: string }>(
      "SELECT status, title, neighborhood, severity FROM issues WHERE id = $1 FOR UPDATE",
      [issueId],
    );
    if (issue.status !== "open") return "conflict" as const;
    const [waiting] = await q.query("SELECT 1 FROM contracts WHERE issue_id = $1 AND status = 'sent'", [issueId]);
    if (waiting) return "contract_waiting" as const;
    const [row] = await q.query<{ id: number }>(
      `INSERT INTO contracts (issue_id, office_id, authority_id, authority_name, scope, price_pkr, start_date, finish_date, payment_terms, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        issueId,
        officeId,
        actor.personId,
        actor.displayName || actor.email || "Authority",
        terms.scope,
        terms.pricePkr,
        terms.startDate,
        terms.finishDate,
        terms.paymentTerms,
        nowIso(),
      ],
    );
    return { id: row.id, issue };
  });
  if (typeof result === "string") return { status: result };
  if (!actor.isDemo)
    await sendQuietly({
      to: await staffEmails(officeId),
      subject: `Contract for ${office.name}: ${result.issue.title}`,
      body: [
        `The city offers ${office.name} a contract for an Issue in ${result.issue.neighborhood}. The job is yours only if you accept.`,
        "",
        `${result.issue.title} (${result.issue.severity})`,
        ...termLines(terms),
        "",
        "Read it in Invisible City, then accept or decline:",
        `${site()}/office/contracts`,
      ].join("\n"),
    });
  return { status: "sent", id: result.id };
}

export interface ContractRow {
  id: number;
  issue_id: number;
  title: string;
  category: string;
  severity: string;
  neighborhood: string;
  cover_image: string | null;
  office_id: number;
  office: string;
  /** False when nobody can sign in as the Business to answer (Demo scenery). */
  can_answer: boolean;
  authority_name: string;
  scope: string;
  price_pkr: number | null;
  start_date: string | null;
  finish_date: string;
  payment_terms: string | null;
  status: "sent" | "accepted" | "declined" | "withdrawn";
  sent_at: string;
  decided_at: string | null;
  decline_reason: string | null;
}

/**
 * Contracts this person may see, waiting ones first: a Business its own, an Authority those of the Issues in its area.
 * `issueId` narrows them to one Issue.
 */
export function listContracts(actor: Actor, issueId: number | null = null) {
  const own = actor.role === "office";
  return sql().query<ContractRow>(
    `SELECT c.id, c.issue_id, i.title, i.category, i.severity, i.neighborhood, i.cover_image, c.office_id, o.name AS office,
            EXISTS (SELECT 1 FROM office_staff s WHERE s.office_id = o.id) AS can_answer, c.authority_name, c.scope, c.price_pkr,
            to_char(c.start_date, 'YYYY-MM-DD') AS start_date, to_char(c.finish_date, 'YYYY-MM-DD') AS finish_date,
            c.payment_terms, c.status, c.sent_at, c.decided_at, c.decline_reason
     FROM contracts c JOIN issues i ON i.id = c.issue_id JOIN offices o ON o.id = c.office_id
     WHERE i.is_demo = $1 AND i.deleted_at IS NULL
       AND ($2::int IS NULL OR c.office_id = $2) AND ($3::text IS NULL OR i.neighborhood = $3) AND ($4::int IS NULL OR c.issue_id = $4)
     ORDER BY (c.status = 'sent') DESC, COALESCE(c.decided_at, c.sent_at) DESC, c.id DESC LIMIT 200`,
    [actor.isDemo, own ? (actor.officeId ?? -1) : null, own ? null : actor.area, issueId],
  );
}

export type AnswerOutcome = "ok" | "not_found" | "conflict";
interface Answered {
  issueId: number;
  title: string;
  neighborhood: string;
  office: string;
}

/** The Business's own contract on an Issue that still exists, with the Issue locked. Same lock order as sending. */
async function lockForAnswer(q: Sql, actor: Actor, id: number) {
  const [c] = await q.query<{ issue_id: number }>("SELECT issue_id FROM contracts WHERE id = $1 AND office_id = $2", [id, actor.officeId]);
  if (!c) return null;
  const [i] = await q.query<{ status: string; title: string; neighborhood: string }>(
    "SELECT status, title, neighborhood FROM issues WHERE id = $1 AND deleted_at IS NULL AND is_demo = $2 FOR UPDATE",
    [c.issue_id, actor.isDemo],
  );
  if (!i) return null;
  const [o] = await q.query<{ name: string }>("SELECT name FROM offices WHERE id = $1 AND revoked_at IS NULL", [actor.officeId]);
  return o ? { issueId: c.issue_id, office: o.name, ...i } : null;
}

async function emailAuthorities(actor: Actor, a: Answered, subject: string, lines: string[]) {
  if (actor.isDemo) return;
  const to = (await areaAuthorities(a.neighborhood, false)).map((x) => x.email);
  await sendQuietly({ to, subject, body: [...lines, "", `${site()}/issues/${a.issueId}`].join("\n") });
}

/** The Business agrees: the contract is accepted and the Issue becomes Assigned to it, in one transaction. */
export async function acceptContract(actor: Actor, id: number): Promise<AnswerOutcome> {
  const out = await sql().tx(async (q) => {
    const c = await lockForAnswer(q, actor, id);
    if (!c) return "not_found" as const;
    if (c.status !== "open") return "conflict" as const;
    const done = await q.query(
      "UPDATE contracts SET status = 'accepted', decided_at = $1, decided_by = $2 WHERE id = $3 AND status = 'sent' RETURNING id",
      [nowIso(), actor.email, id],
    );
    if (!done.length) return "conflict" as const;
    await setAssignment(c.issueId, actor.officeId, "assigned", q);
    await addEvent(c.issueId, "assigned", `Assigned to ${c.office}`, nowIso(), q);
    await settleJobRequests(c.issueId, actor.officeId!, q);
    return c;
  });
  if (typeof out === "string") return out;
  await emailAuthorities(actor, out, `${out.office} accepted the contract: ${out.title}`, [
    `${out.office} accepted your contract. The Issue in ${out.neighborhood} is now Assigned to it.`,
  ]);
  return "ok";
}

/** The Business says no, with a reason. The Issue stays Open, and the Authority may send new terms or ask another Business. */
export async function declineContract(actor: Actor, id: number, reason: string): Promise<AnswerOutcome> {
  const out = await sql().tx(async (q) => {
    const c = await lockForAnswer(q, actor, id);
    if (!c) return "not_found" as const;
    const done = await q.query(
      `UPDATE contracts SET status = 'declined', decided_at = $1, decided_by = $2, decline_reason = $3
       WHERE id = $4 AND status = 'sent' RETURNING id`,
      [nowIso(), actor.email, reason, id],
    );
    return done.length ? c : ("conflict" as const);
  });
  if (typeof out === "string") return out;
  await emailAuthorities(actor, out, `${out.office} declined the contract: ${out.title}`, [
    `${out.office} declined your contract for the Issue in ${out.neighborhood}. The Issue is still Open.`,
    `Their reason: ${reason}`,
  ]);
  return "ok";
}

/** The Authority takes a waiting contract back, to change the terms or ask another Business. */
export async function withdrawContract(actor: Actor, id: number): Promise<AnswerOutcome> {
  const [c] = await sql().query<{ office_id: number; title: string; office: string }>(
    `SELECT c.office_id, i.title, o.name AS office FROM contracts c JOIN issues i ON i.id = c.issue_id JOIN offices o ON o.id = c.office_id
     WHERE c.id = $1 AND i.is_demo = $2 AND i.deleted_at IS NULL AND ($3::text IS NULL OR i.neighborhood = $3)`,
    [id, actor.isDemo, actor.area],
  );
  if (!c) return "not_found";
  const done = await sql().query(
    "UPDATE contracts SET status = 'withdrawn', decided_at = $1, decided_by = $2 WHERE id = $3 AND status = 'sent' RETURNING id",
    [nowIso(), actor.email, id],
  );
  if (!done.length) return "conflict";
  if (!actor.isDemo)
    await sendQuietly({
      to: await staffEmails(c.office_id),
      subject: `Contract withdrawn: ${c.title}`,
      body: `The city has withdrawn the contract it offered ${c.office} for "${c.title}". There is nothing to answer.`,
    });
  return "ok";
}
