import { listDepartments } from "@/lib/authority";
import { checkRegistration, latestRegistration, registerOffice, type RegisterInput } from "@/lib/registration";
import { requireRole, requireSignedIn } from "@/lib/roles";

/** Signed in: where this account's latest Office registration stands, and the Departments to pick from. */
export async function GET() {
  const actor = await requireSignedIn();
  if (actor instanceof Response) return actor;
  return Response.json({
    registration: actor.email ? await latestRegistration(actor.email, actor.isDemo) : null,
    departments: await listDepartments(),
  });
}

/** A Citizen account registers an Office; its Google email becomes the Office's sign-in once an Authority approves. */
export async function POST(req: Request) {
  const actor = await requireRole("citizen");
  if (actor instanceof Response) return actor;
  if (!actor.email) return Response.json({ error: "invalid_email" }, { status: 400 });
  const checked = await checkRegistration((await req.json().catch(() => ({}))) as RegisterInput);
  if ("error" in checked) return Response.json({ error: checked.error }, { status: 400 });
  const out = await registerOffice(checked.value, actor.email, actor.isDemo);
  if (!out.ok) return Response.json({ error: out.error }, { status: 409 });
  return Response.json({ id: out.id }, { status: 201 });
}
