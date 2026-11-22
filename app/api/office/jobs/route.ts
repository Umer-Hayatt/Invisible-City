import { requireRole } from "@/lib/roles";
import { sql } from "@/lib/sql";

/** Office staff: the Issues assigned to their own Office. (The workflow buttons arrive in PLAN step 6.) */
export async function GET() {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  const jobs = await sql().query(
    `SELECT i.id, i.title, i.status, i.severity, i.neighborhood, i.report_count
     FROM issues i WHERE i.office_id = $1 AND i.deleted_at IS NULL ORDER BY i.priority DESC, i.id DESC`,
    [actor.officeId],
  );
  return Response.json({ jobs });
}
