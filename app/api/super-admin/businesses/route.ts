import { listBusinesses } from "@/lib/directory";
import { requireRole } from "@/lib/roles";

/** Super Admin: every Business of their world, with its email, workers, jobs in hand and Fixes. */
export async function GET() {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  return Response.json({ businesses: await listBusinesses(actor.isDemo) });
}
