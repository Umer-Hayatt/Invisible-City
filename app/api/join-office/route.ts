import { askToJoin, latestRequest, officeChoices } from "@/lib/joining";
import { normalizePhone } from "@/lib/profile";
import { requireSignedIn } from "@/lib/roles";

/**
 * Office staff sign-up. Signed in with Google (so the email is proven), a person picks the Office they work for
 * and asks to join; an Authority approves it on the Offices page. Who is asking always comes from the session.
 */
export async function GET() {
  const actor = await requireSignedIn();
  if (actor instanceof Response) return actor;
  return Response.json({
    offices: await officeChoices(actor.isDemo),
    request: actor.email ? await latestRequest(actor.email, actor.isDemo) : null,
    role: actor.role,
    displayName: actor.displayName,
    phone: actor.phone,
  });
}

export async function POST(req: Request) {
  const actor = await requireSignedIn();
  if (actor instanceof Response) return actor;
  // Officials already have their role; only a Citizen account can ask to become Office staff.
  if (actor.role !== "citizen") return Response.json({ error: "already_official" }, { status: 409 });
  if (!actor.email) return Response.json({ error: "invalid_email" }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const officeId = Number(b.officeId);
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(String(b.phone ?? ""));
  if (!Number.isInteger(officeId)) return Response.json({ error: "invalid_office" }, { status: 400 });
  if (name.length < 2 || name.length > 80) return Response.json({ error: "invalid_name" }, { status: 400 });
  if (!phone) return Response.json({ error: "invalid_phone" }, { status: 400 });

  const out = await askToJoin({ officeId, name, email: actor.email, phone, demo: actor.isDemo });
  if (out === "not_found") return Response.json({ error: "invalid_office" }, { status: 400 });
  if (out === "already_requested") return Response.json({ error: "already_requested" }, { status: 409 });
  return Response.json({ ok: true }, { status: 201 });
}
