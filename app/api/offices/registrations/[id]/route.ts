import { decideRegistration } from "@/lib/registration";
import { requireRole } from "@/lib/roles";

const STATUS = { not_found: 404, out_of_area: 403, conflict: 409, email_taken: 409 } as const;

/** Authority: approve (creates the Office and its sign-in) or decline a pending Office registration. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const { decision } = (await req.json().catch(() => ({}))) as { decision?: unknown };
  if (decision !== "approved" && decision !== "declined") return Response.json({ error: "invalid_decision" }, { status: 400 });
  if (!Number.isInteger(Number(id))) return Response.json({ error: "not_found" }, { status: 404 });
  const out = await decideRegistration(Number(id), decision, { email: actor.email, area: actor.area }, actor.isDemo);
  if (out === "approved" || out === "declined") return Response.json({ ok: true, decision: out });
  return Response.json({ error: out }, { status: STATUS[out] });
}
