import { requireRole } from "@/lib/roles";
import { cleanText, outcomeResponse, sendBack } from "@/lib/workflow";

/** Office staff of the assigned Office: return an Assigned Issue to the Authorities as Open, with a reason. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  if (!Number.isInteger(issueId)) return outcomeResponse("not_found");
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = cleanText(body.reason, 500);
  if (!reason) return Response.json({ error: "invalid_reason" }, { status: 400 });
  return outcomeResponse(await sendBack(actor, issueId, reason));
}
