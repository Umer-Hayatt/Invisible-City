import { removeStaff } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

/** Authority: remove a staff member from an Office. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; staffId: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id, staffId } = await ctx.params;
  if (!Number.isInteger(Number(id)) || !Number.isInteger(Number(staffId)))
    return Response.json({ error: "not_found" }, { status: 404 });
  if (!(await removeStaff(Number(id), Number(staffId), actor.isDemo))) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
