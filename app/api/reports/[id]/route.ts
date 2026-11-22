import { requireRole } from "@/lib/roles";
import { deleteOwnReport } from "@/lib/reporting";

/** A Citizen deletes their own Report, only while its Issue is still Open. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "not_found" }, { status: 404 });
  const outcome = await deleteOwnReport(id, actor.personId);
  if (outcome === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
  if (outcome === "not_open") return Response.json({ error: "not_open" }, { status: 409 });
  return Response.json({ ok: true });
}
