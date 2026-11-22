import { flagSpam } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

/** Authority: mark a Report as spam. It disappears from every view; a third flag suspends the Citizen. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; reportId: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id, reportId } = await ctx.params;
  const issueId = Number(id);
  const rid = Number(reportId);
  if (!Number.isInteger(issueId) || !Number.isInteger(rid)) return Response.json({ error: "not_found" }, { status: 404 });
  const out = await flagSpam(issueId, rid, actor.personId, actor.isDemo);
  if (out.status === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true, issueRemoved: out.issueRemoved, suspended: out.suspended });
}
