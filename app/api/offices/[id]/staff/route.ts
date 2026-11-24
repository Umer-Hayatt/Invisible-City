import { addStaff, officeInArea } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Authority: set an Office's one email. It replaces the Office's old email; an email on another Office is refused. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return Response.json({ error: "invalid_email" }, { status: 400 });
  if (!Number.isInteger(Number(id))) return Response.json({ error: "not_found" }, { status: 404 });
  if (!(await officeInArea(Number(id), actor.area))) return Response.json({ error: "out_of_area" }, { status: 403 });
  const outcome = await addStaff(Number(id), email, actor.isDemo);
  if (outcome === "not_found") return Response.json({ error: "not_found" }, { status: 404 });
  if (outcome === "email_taken") return Response.json({ error: "email_taken" }, { status: 409 });
  return Response.json({ ok: true }, { status: 201 });
}
