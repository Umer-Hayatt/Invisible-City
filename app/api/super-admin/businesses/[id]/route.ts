import { revokeBusiness } from "@/lib/directory";
import { requireRole } from "@/lib/roles";

/** Super Admin: revoke a Business. Its unfinished jobs go back to Open for the Authority. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const out = Number.isInteger(Number(id)) ? await revokeBusiness(Number(id), actor.email, actor.isDemo) : null;
  if (!out) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true, reopened: out.reopened });
}
