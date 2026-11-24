import { listJoinRequests } from "@/lib/joining";
import { requireRole } from "@/lib/roles";

/** Authority: requests to join an Office, from their own world, waiting ones first. Contact details are for Authorities only. */
export async function GET() {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  return Response.json({ requests: await listJoinRequests(actor.isDemo) });
}
