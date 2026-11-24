import { listAuthorities, revokeAuthority } from "@/lib/directory";
import { requireRole } from "@/lib/roles";

/** Super Admin: every Authority of their world, with area, Department and contact details. */
export async function GET() {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  return Response.json({ authorities: await listAuthorities(actor.isDemo) });
}

/** Super Admin: revoke an Authority by email. They are a Citizen again on their next page load. */
export async function DELETE(req: Request) {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  const email = String(new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return Response.json({ error: "invalid_email" }, { status: 400 });
  if (!(await revokeAuthority(email, actor.email, actor.isDemo))) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
