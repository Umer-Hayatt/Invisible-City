import { getIssue } from "@/lib/db";
import { currentActor, dataWorld } from "@/lib/roles";

/**
 * Public, with each reporter's display name. An Authority of the Issue's area (or of the whole city), or staff of the
 * Office the Issue is assigned to, also get email and phone. This is decided here, in the response shape, not in the screens.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/issues/[id]">) {
  const { id } = await ctx.params;
  const { demo } = await dataWorld();
  const data = await getIssue(Number(id), demo);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  const actor = await currentActor();
  const mayContact =
    !!actor &&
    actor.isDemo === demo &&
    ((actor.role === "authority" && (!actor.area || actor.area === data.issue.neighborhood)) || (actor.role === "office" && actor.officeId === data.issue.office_id));
  if (mayContact) return Response.json(await getIssue(Number(id), demo, undefined, { contacts: true }));
  return Response.json(data);
}
