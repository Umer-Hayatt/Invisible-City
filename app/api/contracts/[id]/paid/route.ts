import { markContractPaid } from "@/lib/contracts";
import { requireRole } from "@/lib/roles";

/**
 * Authority: record that the city paid the Business for an accepted contract, with an optional reference (a cheque
 * number or transfer reference). Allowed once the Citizen has confirmed the Fix. Civora never moves money.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { reference?: unknown };
  const reference = typeof b.reference === "string" ? b.reference.trim() : "";
  if (reference.length > 120) return Response.json({ error: "invalid_reference" }, { status: 400 });
  const out = await markContractPaid(actor, id, reference || null);
  if (out === "ok") return Response.json({ ok: true });
  const status = { not_found: 404, conflict: 409, not_resolved: 409 }[out];
  return Response.json({ error: out }, { status });
}
