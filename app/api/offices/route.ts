import { addOffice, listDepartments, listOffices } from "@/lib/authority";
import { requireRole } from "@/lib/roles";

/** Authority: every Office with its staff, and the Departments an Office can belong to. */
export async function GET() {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  return Response.json({ offices: await listOffices(actor.isDemo), departments: await listDepartments() });
}

/** Authority: add an Office. */
export async function POST(req: Request) {
  const actor = await requireRole("authority");
  if (actor instanceof Response) return actor;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const sector = String(b.sector ?? "").trim();
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const departmentId = Number(b.departmentId);
  if (name.length < 2 || name.length > 120) return Response.json({ error: "invalid_office_name" }, { status: 400 });
  if (!sector || sector.length > 40) return Response.json({ error: "invalid_sector" }, { status: 400 });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return Response.json({ error: "invalid_location" }, { status: 400 });
  const id = Number.isInteger(departmentId) ? await addOffice({ name, departmentId, sector, lat, lng }, actor.isDemo) : null;
  if (!id) return Response.json({ error: "invalid_department" }, { status: 400 });
  return Response.json({ id }, { status: 201 });
}
