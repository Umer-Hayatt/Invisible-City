import { suggestedOffices } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

/** Authority: the Offices of the Issue's Department, nearest first. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const offices = Number.isInteger(Number(id)) ? await suggestedOffices(Number(id), actor.isDemo) : null;
  if (!offices) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ offices });
}
