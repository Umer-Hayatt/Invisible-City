import { listRegistrations } from "@/lib/registration";
import { requireRole } from "@/lib/roles";

/** Authority: Office registrations of their area (every area for a whole-city Authority), pending first. */
export async function GET() {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  return Response.json({ registrations: await listRegistrations(actor.isDemo, actor.area) });
}
