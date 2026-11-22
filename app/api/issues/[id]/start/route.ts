import { requireRole } from "@/lib/roles";
import { outcomeResponse, startWork } from "@/lib/workflow";

/** Office staff of the assigned Office: Assigned to In progress. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const issueId = Number((await ctx.params).id);
  if (!Number.isInteger(issueId)) return outcomeResponse("not_found");
  return outcomeResponse(await startWork(actor, issueId));
}
