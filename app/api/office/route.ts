import { setWorkers } from "@/lib/authority";
import { MAX_WORKERS } from "@/lib/registration";
import { requireRole } from "@/lib/roles";
import { sql } from "@/lib/sql";

/** Office staff: their own Office, with how many workers it has. */
export async function GET() {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const [office] = await sql().query(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.workers, o.is_private,
            (SELECT COUNT(*) FROM issues i WHERE i.office_id = o.id AND i.deleted_at IS NULL
               AND i.status IN ('assigned', 'in_progress'))::int AS active
     FROM offices o JOIN departments d ON d.id = o.department_id WHERE o.id = $1`,
    [actor.officeId],
  );
  return Response.json({ office });
}

/** Office staff: record how many workers the Office has. Workers with no active job count as spare hands. */
export async function PUT(req: Request) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const { workers } = (await req.json().catch(() => ({}))) as { workers?: unknown };
  const n = Number(workers);
  if (!Number.isInteger(n) || n < 0 || n > MAX_WORKERS) return Response.json({ error: "invalid_workers" }, { status: 400 });
  await setWorkers(actor.officeId!, n);
  return Response.json({ ok: true, workers: n });
}
