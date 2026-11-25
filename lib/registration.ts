import { addOffice, addStaff } from "./authority";
import { nowIso } from "./clock";
import { NEIGHBORHOODS } from "./geo";
import { sendQuietly } from "./mailer";
import { normalizePhone } from "./profile";
import { Sql, sql } from "./sql";

/**
 * Office registration: an Office (a city Department's office, or a private business doing the same work) registers
 * itself with the Google account it will sign in with. Any Authority of that area, or of the whole city, approves it;
 * approval creates the Office and makes the registering email its one sign-in.
 */
export interface OfficeRegistration {
  id: number;
  name: string;
  department: string;
  department_id: number;
  sector: string;
  is_private: boolean;
  workers: number;
  contact_name: string;
  email: string;
  phone: string | null;
  decision: "pending" | "approved" | "declined";
  decided_by: string | null;
  office_id: number | null;
  created_at: string;
  decided_at: string | null;
  /** This email signed in as a Business the Super Admin revoked, so the Authority can weigh that. */
  revoked_before: boolean;
}

const SELECT = `SELECT r.id, r.name, d.name AS department, r.department_id, r.sector, r.is_private, r.workers, r.contact_name,
       r.email, r.phone, r.decision, r.decided_by, r.office_id, r.created_at, r.decided_at,
       EXISTS (SELECT 1 FROM office_staff s JOIN offices o ON o.id = s.office_id
               WHERE lower(s.email) = lower(r.email) AND o.revoked_at IS NOT NULL) AS revoked_before
  FROM office_registrations r JOIN departments d ON d.id = r.department_id`;

export const MAX_WORKERS = 10_000;

export type RegisterInput = {
  name: unknown;
  departmentId: unknown;
  sector: unknown;
  isPrivate: unknown;
  workers: unknown;
  contactName: unknown;
  phone: unknown;
};

/** Checks the form; returns the clean values or an error code. */
export async function checkRegistration(b: RegisterInput) {
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const contactName = String(b.contactName ?? "").trim().replace(/\s+/g, " ");
  const sector = String(b.sector ?? "").trim();
  const departmentId = Number(b.departmentId);
  const workers = Number(b.workers ?? 0);
  const phone = normalizePhone(String(b.phone ?? ""));
  if (name.length < 2 || name.length > 120) return { error: "invalid_office_name" } as const;
  if (contactName.length < 2 || contactName.length > 80) return { error: "invalid_name" } as const;
  if (!NEIGHBORHOODS.some((n) => n.name === sector)) return { error: "invalid_sector" } as const;
  if (!Number.isInteger(workers) || workers < 0 || workers > MAX_WORKERS) return { error: "invalid_workers" } as const;
  if (!phone) return { error: "invalid_phone" } as const;
  const [dept] = Number.isInteger(departmentId)
    ? await sql().query("SELECT 1 FROM departments WHERE id = $1", [departmentId])
    : [];
  if (!dept) return { error: "invalid_department" } as const;
  return { value: { name, contactName, sector, departmentId, workers, phone, isPrivate: b.isPrivate === true } } as const;
}

export type RegisterOutcome = { ok: true; id: number } | { ok: false; error: "email_taken" | "already_requested" };

/**
 * Files a registration under the signed-in email. An email already on an Office, or already waiting, is refused;
 * the email of a revoked Office may register again.
 */
export async function registerOffice(
  v: { name: string; contactName: string; sector: string; departmentId: number; workers: number; phone: string; isPrivate: boolean },
  email: string,
  demo: boolean,
): Promise<RegisterOutcome> {
  const q = sql();
  const [staff] = await q.query(
    "SELECT 1 FROM office_staff s JOIN offices o ON o.id = s.office_id WHERE lower(s.email) = lower($1) AND o.revoked_at IS NULL",
    [email],
  );
  if (staff) return { ok: false, error: "email_taken" };
  const [pending] = await q.query(
    "SELECT 1 FROM office_registrations WHERE lower(email) = lower($1) AND is_demo = $2 AND decision = 'pending'",
    [email, demo],
  );
  if (pending) return { ok: false, error: "already_requested" };
  const [row] = await q.query<{ id: number }>(
    `INSERT INTO office_registrations (name, department_id, sector, is_private, workers, contact_name, email, phone, is_demo, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [v.name, v.departmentId, v.sector, v.isPrivate, v.workers, v.contactName, email.toLowerCase(), v.phone, demo, nowIso()],
  );
  return { ok: true, id: row.id };
}

/** The latest registration made with this email, so the form can say where it stands. */
export async function latestRegistration(email: string, demo: boolean) {
  const [row] = await sql().query<OfficeRegistration>(
    `${SELECT} WHERE lower(r.email) = lower($1) AND r.is_demo = $2 ORDER BY r.created_at DESC, r.id DESC LIMIT 1`,
    [email, demo],
  );
  return row ?? null;
}

/** Registrations an Authority may decide: their area's, or every area's for a whole-city Authority. Pending first. */
export async function listRegistrations(demo: boolean, area: string | null) {
  return sql().query<OfficeRegistration>(
    `${SELECT} WHERE r.is_demo = $1 AND ($2::text IS NULL OR r.sector = $2)
     ORDER BY (r.decision = 'pending') DESC, r.created_at DESC, r.id DESC LIMIT 100`,
    [demo, area],
  );
}

export type DecideOutcome = "approved" | "declined" | "not_found" | "conflict" | "email_taken" | "out_of_area";

/**
 * Approve or decline a pending registration. Approval creates the Office at its sector's centre, with the workers it
 * gave, and makes the registering email its one sign-in, all in one transaction. The registrant gets an email (never in the Demo).
 */
export async function decideRegistration(
  id: number,
  decision: "approved" | "declined",
  by: { email: string | null; area: string | null },
  demo: boolean,
): Promise<DecideOutcome> {
  const outcome = await sql().tx(async (q: Sql): Promise<DecideOutcome> => {
    const [r] = await q.query<OfficeRegistration>(`${SELECT} WHERE r.id = $1 AND r.is_demo = $2 FOR UPDATE OF r`, [id, demo]);
    if (!r) return "not_found";
    if (by.area && r.sector !== by.area) return "out_of_area";
    if (r.decision !== "pending") return "conflict";
    let officeId: number | null = null;
    if (decision === "approved") {
      const hood = NEIGHBORHOODS.find((n) => n.name === r.sector)!;
      officeId = await addOffice(
        { name: r.name, departmentId: r.department_id, sector: r.sector, lat: hood.lat, lng: hood.lng, workers: r.workers, isPrivate: r.is_private, phone: r.phone },
        demo,
        q,
      );
      if (!officeId) return "not_found";
      // A revoked Office gives up its email, so the same people can come back as a new Business.
      await q.query(
        "DELETE FROM office_staff s USING offices o WHERE o.id = s.office_id AND o.revoked_at IS NOT NULL AND o.is_demo = $2 AND lower(s.email) = lower($1)",
        [r.email, demo],
      );
      const staff = await addStaff(officeId, r.email, demo, q);
      if (staff !== "added") throw new EmailTaken();
    }
    await q.query("UPDATE office_registrations SET decision = $1, decided_by = $2, decided_at = $3, office_id = $4 WHERE id = $5", [
      decision,
      by.email,
      nowIso(),
      officeId,
      id,
    ]);
    return decision;
  }).catch((e) => {
    if (e instanceof EmailTaken) return "email_taken" as const;
    throw e;
  });

  if (!demo && (outcome === "approved" || outcome === "declined")) {
    const [r] = await sql().query<{ email: string; name: string }>("SELECT email, name FROM office_registrations WHERE id = $1", [id]);
    await sendQuietly(
      outcome === "approved"
        ? {
            to: [r.email],
            subject: `${r.name} is now a Business on Invisible City`,
            body: `Your Business registration was approved. Sign in to Invisible City with this Google account (${r.email}) to see the Issues assigned to ${r.name}.`,
          }
        : {
            to: [r.email],
            subject: `Your Business registration for ${r.name}`,
            body: `Your Business registration was not approved. You can contact the city Authority of your area, or register again with corrected details.`,
          },
    );
  }
  return outcome;
}

/** Thrown inside the transaction so the new Office is rolled back when its email belongs to another Office. */
class EmailTaken extends Error {}
