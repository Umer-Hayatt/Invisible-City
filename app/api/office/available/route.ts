import { availableJobs } from "@/lib/jobs";
import { requireRole } from "@/lib/roles";

/** Business: Open Issues of its Department in its sector that it could ask to fix. */
export async function GET() {
  const actor = await requireRole("office");
  if (actor instanceof Response) return actor;
  return Response.json({ jobs: await availableJobs(actor.officeId!) });
}
