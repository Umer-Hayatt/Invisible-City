import { acceptContract, declineContract, withdrawContract } from "@/lib/contracts";
import { requireRole } from "@/lib/roles";
import { cleanText, outcomeResponse } from "@/lib/workflow";

type Ctx = { params: Promise<{ id: string }> };

/** The Business offered the contract: accept it (the Issue becomes its job) or decline it with a reason. */
export async function POST(req: Request, ctx: Ctx) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return outcomeResponse("not_found");
  const b = (await req.json().catch(() => ({}))) as { decision?: unknown; reason?: unknown };
  if (b.decision === "accepted") return outcomeResponse(await acceptContract(actor, id));
  if (b.decision !== "declined") return Response.json({ error: "invalid_answer" }, { status: 400 });
  const reason = cleanText(b.reason, 500);
  if (!reason) return Response.json({ error: "invalid_decline_reason" }, { status: 400 });
  return outcomeResponse(await declineContract(actor, id, reason));
}

/** Authority: withdraw a contract that is still waiting for its answer. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return outcomeResponse("not_found");
  return outcomeResponse(await withdrawContract(actor, id));
}
