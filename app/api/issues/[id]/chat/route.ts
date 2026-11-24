import { chatContacts, chatScope, listMessages, postMessage } from "@/lib/jobs";

type Thread = { error: Response } | { actor: Actor; scope: NonNullable<Awaited<ReturnType<typeof chatScope>>> };
import { requireRole, type Actor } from "@/lib/roles";

/**
 * The chat between a Business and the Authorities of an Issue's area, one per Issue and Business. A Business always
 * uses its own thread; an Authority names the Business with ?office=.
 */
async function thread(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Thread> {
  const actor = await requireRole("authority", "office");
  if (actor instanceof Response) return { error: actor };
  const { id } = await ctx.params;
  const officeId = actor.role === "office" ? actor.officeId! : Number(new URL(req.url).searchParams.get("office"));
  const scope = Number.isInteger(Number(id)) && Number.isInteger(officeId) ? await chatScope(actor, Number(id), officeId) : null;
  if (!scope) return { error: Response.json({ error: "not_found" }, { status: 404 }) };
  return { actor, scope };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t = await thread(req, ctx);
  if ("error" in t) return t.error;
  return Response.json({
    title: t.scope.title,
    office: t.scope.office,
    messages: await listMessages(t.scope.issueId, t.scope.officeId),
    contacts: await chatContacts(t.actor, t.scope),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t = await thread(req, ctx);
  if ("error" in t) return t.error;
  const { body } = (await req.json().catch(() => ({}))) as { body?: unknown };
  const text = String(body ?? "").trim();
  if (!text || text.length > 2000) return Response.json({ error: "invalid_message" }, { status: 400 });
  return Response.json({ message: await postMessage(t.actor, t.scope, text) }, { status: 201 });
}
