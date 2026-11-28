import { listNgoRegistrations } from "@/lib/registration";
import { requireRole } from "@/lib/roles";

/** Super Admin: the NGO registrations of their own world, waiting ones first. */
export async function GET() {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  return Response.json({ registrations: await listNgoRegistrations(actor.isDemo) });
}
