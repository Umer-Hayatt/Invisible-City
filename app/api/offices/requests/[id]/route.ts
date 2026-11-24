import { decideJoin } from "@/lib/joining";
import { requireRole } from "@/lib/roles";

/** Authority: approve (adds the person to that Office's staff) or decline a waiting request to join an Office. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const { decision } = (await req.json().catch(() => ({}))) as { decision?: unknown };
  if (decision !== "approved" && decision !== "declined") return Response.json({ error: "bad_request" }, { status: 400 });
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) return Response.json({ error: "not_found" }, { status: 404 });

  const out = await decideJoin(requestId, decision, { email: actor.email, demo: actor.isDemo });
  if (out === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
  if (out === "conflict") return Response.json({ error: "conflict" }, { status: 409 });
  if (out === "email_taken") return Response.json({ error: "email_taken" }, { status: 409 });
  return Response.json({ ok: true, decision: out });
}
