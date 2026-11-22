import { validateProfile } from "@/lib/profile";
import { requireSignedIn } from "@/lib/roles";
import { sql } from "@/lib/sql";

/** First-sign-in profile: display name and a `+92 3xx xxxxxxx` phone. The email comes from Google. */
export async function PUT(req: Request) {
  const actor = await requireSignedIn();
  if (actor instanceof Response) return actor;
  if (actor.isDemo) return Response.json({ error: "demo_profile" }, { status: 403 }); // Demo people are shared by every visitor
  const body = (await req.json().catch(() => ({}))) as { displayName?: unknown; phone?: unknown };
  const v = validateProfile(body);
  if ("error" in v) return Response.json({ error: v.error }, { status: 400 });
  await sql().query("UPDATE people SET display_name = $1, phone = $2 WHERE id = $3", [v.displayName, v.phone, actor.personId]);
  return Response.json({ ok: true, displayName: v.displayName, phone: v.phone });
}
