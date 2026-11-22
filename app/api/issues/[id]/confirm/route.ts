import { requireRole } from "@/lib/roles";
import { confirmFix, outcomeResponse } from "@/lib/workflow";

/** A Citizen who reported the Issue confirms its Fix: Fixed to Resolved. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  if (!Number.isInteger(issueId)) return outcomeResponse("not_found");
  return outcomeResponse(await confirmFix(actor, issueId));
}
