import { assignIssue } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

/** Authority: hand an Open Issue to one of its suggested Offices. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { officeId?: unknown };
  const issueId = Number(id);
  const officeId = Number(body.officeId);
  if (!Number.isInteger(issueId)) return Response.json({ error: "not_found" }, { status: 404 });
  if (!Number.isInteger(officeId)) return Response.json({ error: "invalid_office" }, { status: 400 });
  const outcome = await assignIssue(issueId, officeId, actor.isDemo, actor.area);
  if (outcome === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
  if (outcome === "invalid_office") return Response.json({ error: "invalid_office" }, { status: 400 });
  if (outcome === "out_of_area") return Response.json({ error: "out_of_area" }, { status: 403 });
  if (outcome === "conflict") return Response.json({ error: "conflict" }, { status: 409 });
  return Response.json({ ok: true });
}
