import { parseTerms, sendContract } from "@/lib/contracts";
import { requireRole } from "@/lib/roles";

const STATUS = { not_found: 404, invalid_office: 400, no_business_email: 400, out_of_area: 403, conflict: 409, contract_waiting: 409 };

/** Authority: offer an Open Issue to one of its suggested Businesses as a contract. The Business accepts or declines it. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const officeId = Number(body.officeId);
  if (!Number.isInteger(issueId)) return Response.json({ error: "not_found" }, { status: 404 });
  if (!Number.isInteger(officeId)) return Response.json({ error: "invalid_office" }, { status: 400 });
  const terms = parseTerms(body);
  if (typeof terms === "string") return Response.json({ error: terms }, { status: 400 });
  const out = await sendContract(actor, issueId, officeId, terms);
  if (out.status !== "sent") return Response.json({ error: out.status }, { status: STATUS[out.status] });
  return Response.json({ id: out.id }, { status: 201 });
}
