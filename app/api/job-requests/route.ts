import { listJobRequests } from "@/lib/jobs";
import { requireRole } from "@/lib/roles";

/** Authority: Businesses asking for jobs in their area (every area for a whole-city Authority), waiting first. */
export async function GET() {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  return Response.json({ requests: await listJobRequests(actor.isDemo, actor.area) });
}
