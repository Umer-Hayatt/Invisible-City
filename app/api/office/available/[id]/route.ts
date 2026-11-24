import { requestJob } from "@/lib/jobs";
import { requireRole } from "@/lib/roles";

/** Business: ask the Authorities of the area to be given this Open Issue, with an optional note. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const { note } = (await req.json().catch(() => ({}))) as { note?: unknown };
  const text = String(note ?? "").trim();
  if (text.length > 500) return Response.json({ error: "invalid_note" }, { status: 400 });
  if (!Number.isInteger(Number(id))) return Response.json({ error: "not_found" }, { status: 404 });
  const out = await requestJob(actor.officeId!, Number(id), text);
  if (out === "not_available") return Response.json({ error: "not_available" }, { status: 404 });
  if (out === "already_requested") return Response.json({ error: "already_requested" }, { status: 409 });
  return Response.json({ ok: true }, { status: 201 });
}
