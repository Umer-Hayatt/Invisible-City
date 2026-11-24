import { setOfficePhone, setWorkers } from "@/lib/authority";
import { normalizePhone } from "@/lib/profile";
import { MAX_WORKERS } from "@/lib/registration";
import { requireRole } from "@/lib/roles";
import { sql } from "@/lib/sql";

/** Office staff: their own Office, with how many workers it has. */
export async function GET() {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const [office] = await sql().query(
    `SELECT o.id, o.name, d.name AS department, o.sector, o.workers, o.is_private, o.phone,
            (SELECT COUNT(*) FROM issues i WHERE i.office_id = o.id AND i.deleted_at IS NULL
               AND i.status IN ('assigned', 'in_progress'))::int AS active
     FROM offices o JOIN departments d ON d.id = o.department_id WHERE o.id = $1`,
    [actor.officeId],
  );
  return Response.json({ office });
}

/**
 * Business: record how many workers it has (workers with no active job count as spare hands) and/or its phone,
 * which the Authorities of its area can call.
 */
export async function PUT(req: Request) {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const b = (await req.json().catch(() => ({}))) as { workers?: unknown; phone?: unknown };
  const out: { workers?: number; phone?: string } = {};
  if (b.workers !== undefined) {
    const n = Number(b.workers);
    if (!Number.isInteger(n) || n < 0 || n > MAX_WORKERS) return Response.json({ error: "invalid_workers" }, { status: 400 });
    out.workers = n;
  }
  if (b.phone !== undefined) {
    const phone = normalizePhone(String(b.phone));
    if (!phone) return Response.json({ error: "invalid_phone" }, { status: 400 });
    out.phone = phone;
  }
  if (out.workers !== undefined) await setWorkers(actor.officeId!, out.workers);
  if (out.phone !== undefined) await setOfficePhone(actor.officeId!, out.phone);
  return Response.json({ ok: true, ...out });
}
