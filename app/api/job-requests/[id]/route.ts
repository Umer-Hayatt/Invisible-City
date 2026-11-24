import { declineJobRequest } from "@/lib/jobs";
import { requireRole } from "@/lib/roles";

/** Authority: turn down a waiting Job request. To accept one, send that Business a contract. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  if (!Number.isInteger(Number(id)) || !(await declineJobRequest(Number(id), actor.isDemo, actor.area)))
    return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
