import { requireRole } from "@/lib/roles";
import { cleanText, outcomeResponse, rejectFix } from "@/lib/workflow";

/** A Citizen who reported the Issue rejects its Fix with a comment: Fixed back to In progress. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  if (!Number.isInteger(issueId)) return outcomeResponse("not_found");
  const body = (await req.json().catch(() => ({}))) as { comment?: unknown };
  const comment = cleanText(body.comment, 1000);
  if (!comment) return Response.json({ error: "invalid_comment" }, { status: 400 });
  return outcomeResponse(await rejectFix(actor, issueId, comment));
}
