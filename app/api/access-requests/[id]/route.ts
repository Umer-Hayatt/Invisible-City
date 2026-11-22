import { nowIso } from "@/lib/clock";
import { requireRole } from "@/lib/roles";
import { sql } from "@/lib/sql";

/** Super Admin: approve or decline a pending Access request of their own world. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const { decision } = (await req.json().catch(() => ({}))) as { decision?: unknown };
  if (decision !== "approved" && decision !== "declined") return Response.json({ error: "invalid_decision" }, { status: 400 });
  const [row] = await sql().query<{ decision: string }>("SELECT decision FROM access_requests WHERE id = $1 AND is_demo = $2", [
    Number(id) || 0,
    actor.isDemo,
  ]);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (row.decision !== "pending") return Response.json({ error: "conflict" }, { status: 409 });
  await sql().query("UPDATE access_requests SET decision = $1, decided_by = $2, decided_at = $3 WHERE id = $4", [
    decision,
    actor.email,
    nowIso(),
    Number(id),
  ]);
  return Response.json({ ok: true, decision });
}
