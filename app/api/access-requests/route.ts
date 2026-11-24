import { nowIso } from "@/lib/clock";
import { NEIGHBORHOODS } from "@/lib/geo";
import { normalizePhone } from "@/lib/profile";
import { requireRole } from "@/lib/roles";
import { session } from "@/lib/session";
import { sql } from "@/lib/sql";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Anyone: ask to be made an Authority. A request belongs to the world of whoever sends it (a Demo account's is Demo). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(b.officialEmail ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(b.phone ?? ""));
  const department = String(b.department ?? "");
  // The area the Authority will work for: one sector, or empty for the whole city.
  const area = String(b.area ?? "").trim() || null;
  if (area && !NEIGHBORHOODS.some((n) => n.name === area)) return Response.json({ error: "invalid_sector" }, { status: 400 });
  if (name.length < 2 || name.length > 80) return Response.json({ error: "invalid_name" }, { status: 400 });
  if (!EMAIL.test(email) || email.length > 120) return Response.json({ error: "invalid_email" }, { status: 400 });
  if (!phone) return Response.json({ error: "invalid_phone" }, { status: 400 });
  const [dept] = await sql().query<{ id: number }>("SELECT id FROM departments WHERE name = $1", [department]);
  if (!dept) return Response.json({ error: "invalid_department" }, { status: 400 });
  const isDemo = (await session())?.isDemo ?? false;
  const pending = await sql().query(
    "SELECT 1 FROM access_requests WHERE lower(official_email) = $1 AND decision = 'pending' AND is_demo = $2",
    [email, isDemo],
  );
  if (pending.length) return Response.json({ error: "already_requested" }, { status: 409 });
  await sql().query(
    "INSERT INTO access_requests (name, department_id, official_email, phone, is_demo, created_at, area) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [name, dept.id, email, phone, isDemo, nowIso(), area],
  );
  return Response.json({ ok: true }, { status: 201 });
}

/** Super Admin: the requests of their own world, pending first. */
export async function GET() {
  const actor = await requireRole("super_admin");
  if (actor instanceof Response) return actor;
  const requests = await sql().query(
    `SELECT r.id, r.name, d.name AS department, r.area, r.official_email, r.phone, r.decision, r.decided_by, r.created_at, r.decided_at
     FROM access_requests r LEFT JOIN departments d ON d.id = r.department_id
     WHERE r.is_demo = $1 ORDER BY (r.decision = 'pending') DESC, r.created_at DESC, r.id DESC`,
    [actor.isDemo],
  );
  return Response.json({ requests });
}
