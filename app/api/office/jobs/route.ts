import { closeOverdueFixes } from "@/lib/closure";
import { requireRole } from "@/lib/roles";
import { sql } from "@/lib/sql";

/**
 * Office staff: the Issues assigned to their own Office, the same list for every staff member of that Office.
 * A Fix a Citizen rejected comes back as In progress with the Citizen's comment in `rejection`.
 */
export async function GET() {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  await closeOverdueFixes();
  const jobs = await sql().query(
    `SELECT i.id, i.title, i.status, i.severity, i.category, i.neighborhood, i.report_count, i.cover_image,
            i.after_image, i.fix_note, i.fixed_at, i.created_at,
            CASE WHEN i.status = 'in_progress' THEN (
              SELECT e.message FROM events e WHERE e.issue_id = i.id AND e.kind = 'rejected'
              ORDER BY e.created_at DESC, e.id DESC LIMIT 1
            ) END AS rejection
     FROM issues i
     WHERE i.office_id = $1 AND i.is_demo = $2 AND i.deleted_at IS NULL
     ORDER BY CASE i.status WHEN 'in_progress' THEN 0 WHEN 'assigned' THEN 1 WHEN 'fixed' THEN 2 ELSE 3 END,
              i.priority DESC, i.id DESC`,
    [actor.officeId, actor.isDemo],
  );
  return Response.json({ jobs });
}
