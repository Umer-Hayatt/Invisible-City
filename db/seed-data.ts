import { DEMO_ACCOUNTS } from "../lib/demo-accounts";
import { constituencyFor, haversineMeters, NEIGHBORHOODS } from "../lib/geo";
import { computePriority } from "../lib/scoring";
import { Sql } from "../lib/sql";
import { Category, CATEGORY_META, Severity } from "../lib/types";

/**
 * Demo data: ~70 Issues with the neglect story (I-10, G-11, I-9 resolve almost nothing) and the
 * G-9 recurrence, 19 fictional Offices, and Demo accounts. Deterministic, so demos are repeatable.
 * Everything seeded is flagged is_demo so `clearDemoData` can remove it without touching real rows.
 */

export { DEMO_ACCOUNTS };

/** [name, department, sector]: positions come from the sector centre. */
const OFFICES: [string, string, string][] = [
  ["Roads Sub-division F-7", "Roads", "F-7"],
  ["Roads Sub-division G-9", "Roads", "G-9"],
  ["Roads Sub-division I-9", "Roads", "I-9"],
  ["Sanitation Depot F-6", "Sanitation", "F-6"],
  ["Sanitation Depot G-8", "Sanitation", "G-8"],
  ["Sanitation Depot G-11", "Sanitation", "G-11"],
  ["Sanitation Depot I-10", "Sanitation", "I-10"],
  ["Electrical Works F-8", "Electrical", "F-8"],
  ["Electrical Works G-7", "Electrical", "G-7"],
  ["Electrical Works I-8", "Electrical", "I-8"],
  ["Water & Sewerage F-10", "Water & Sewerage", "F-10"],
  ["Water & Sewerage G-10", "Water & Sewerage", "G-10"],
  ["Water & Sewerage I-9", "Water & Sewerage", "I-9"],
  ["Accessibility Desk Blue Area", "Accessibility", "Blue Area"],
  ["Building Control Blue Area", "Building Control", "Blue Area"],
  ["Building Control G-6", "Building Control", "G-6"],
  ["General Maintenance F-6", "General Maintenance", "F-6"],
  ["General Maintenance G-9", "General Maintenance", "G-9"],
  ["General Maintenance I-8", "General Maintenance", "I-8"],
];

const SEED_TEXT: Partial<Record<Category, string[]>> = {
  road_damage: [
    "Deep pothole near the service road, cars swerving to avoid it",
    "Large crack across the road surface after rain",
    "Broken asphalt at the junction, bikes keep slipping",
    "Pothole filled with water, impossible to see at night",
  ],
  garbage: [
    "Garbage bin overflowing for days, smell is unbearable",
    "Waste dumped on the green belt next to the market",
    "Litter pile attracting stray dogs near the school",
  ],
  streetlight: [
    "Streetlight not working, whole lane is dark at night",
    "Three lights out along the main avenue",
    "Lamp post leaning with exposed wires",
  ],
  water_leak: [
    "Water pipe leaking, clean water running onto the road",
    "Burst main flooding the street every morning",
  ],
  drainage: [
    "Drain blocked, sewage overflowing into the street",
    "Standing water after rain, nala clogged with plastic",
  ],
  blocked_footpath: [
    "Footpath blocked by construction debris",
    "Shops encroaching onto the footpath, pedestrians forced onto the road",
  ],
  accessibility: [
    "No ramp at the market entrance, wheelchair users can't get in",
    "Tactile paving broken and missing near the bus stop",
  ],
};
const SEED_CATEGORIES = Object.keys(SEED_TEXT) as Category[];

const SEED_NAMES = ["Ayesha K.", "Hamza R.", "Fatima S.", "Bilal A.", "Zainab M.", "Usman T.", "Sana I.", "Ali H.", "Mariam N.", "Omar F."];

// [neighbourhood, number of issues, share resolved]
const SEED_PROFILE: [string, number, number][] = [
  ["F-6", 5, 0.8],
  ["F-7", 6, 0.85],
  ["F-8", 4, 0.75],
  ["F-10", 4, 0.5],
  ["F-11", 3, 0.67],
  ["Blue Area", 4, 0.75],
  ["G-6", 4, 0.5],
  ["G-7", 3, 0.34],
  ["G-8", 4, 0.5],
  ["G-9", 7, 0.43],
  ["G-10", 3, 0.67],
  ["G-11", 5, 0.2],
  ["H-8", 2, 0.5],
  ["I-8", 3, 0.67],
  ["I-9", 4, 0.25],
  ["I-10", 8, 0.12],
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export interface SeedPhotos {
  /** one public URL per Category, shown as the "before" photo */
  byCategory: Partial<Record<Category, string>>;
  /** the "after repair" photo on resolved Issues */
  fixed: string;
}

export async function clearDemoData(q: Sql) {
  await q.query("DELETE FROM events WHERE issue_id IN (SELECT id FROM issues WHERE is_demo)");
  await q.query("DELETE FROM reports WHERE issue_id IN (SELECT id FROM issues WHERE is_demo)");
  await q.query("DELETE FROM issues WHERE is_demo");
  await q.query("DELETE FROM offices WHERE is_demo"); // office_staff goes with them
  await q.query("DELETE FROM access_requests WHERE is_demo");
  await q.query("DELETE FROM people WHERE is_demo");
}

export async function seedDemoData(q: Sql, opts: { now?: Date; photos?: SeedPhotos } = {}) {
  const now = opts.now ?? new Date();
  const photos = opts.photos;
  const rand = rng(42);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
  const sevs: Severity[] = ["low", "medium", "medium", "high", "high", "critical"];

  await clearDemoData(q);

  // --- people -------------------------------------------------------------
  const personIds: string[] = [];
  for (const name of SEED_NAMES) {
    const [p] = await q.query<{ id: string }>(
      "INSERT INTO people (auth_id, display_name, is_demo) VALUES ($1, $2, true) RETURNING id",
      ["seed-" + name.replace(/\W/g, "").toLowerCase(), name],
    );
    personIds.push(p.id);
  }
  for (const [role, a] of Object.entries(DEMO_ACCOUNTS)) {
    await q.query(
      "INSERT INTO people (auth_id, email, display_name, phone, is_demo) VALUES ($1, $2, $3, $4, true)",
      ["demo-" + role, a.email, a.name, a.phone],
    );
  }

  // --- offices ------------------------------------------------------------
  const offices: { id: number; name: string; department: string; lat: number; lng: number }[] = [];
  for (const [name, department, sector] of OFFICES) {
    const hood = NEIGHBORHOODS.find((n) => n.name === sector)!;
    const lat = hood.lat + 0.0015;
    const lng = hood.lng - 0.0015;
    const [o] = await q.query<{ id: number }>(
      `INSERT INTO offices (name, department_id, sector, lat, lng, is_demo)
       VALUES ($1, (SELECT id FROM departments WHERE name = $2), $3, $4, $5, true) RETURNING id`,
      [name, department, sector, lat, lng],
    );
    offices.push({ id: o.id, name, department, lat, lng });
  }
  // The Demo Office staff account works for the first Roads Office; the Demo Authority is approved.
  await q.query("INSERT INTO office_staff (office_id, email) VALUES ($1, $2)", [offices[0].id, DEMO_ACCOUNTS.office.email]);
  await q.query(
    `INSERT INTO access_requests (name, department_id, official_email, phone, decision, decided_by, decided_at, is_demo)
     VALUES ($1, (SELECT id FROM departments WHERE name = 'General Maintenance'), $2, $3, 'approved', $4, $5, true)`,
    [DEMO_ACCOUNTS.authority.name, DEMO_ACCOUNTS.authority.email, DEMO_ACCOUNTS.authority.phone, DEMO_ACCOUNTS.superAdmin.email, now.toISOString()],
  );

  const departmentOf = (c: Category) => {
    const team = CATEGORY_META[c].team;
    return {
      "Road Maintenance Unit": "Roads",
      "Sanitation Crew": "Sanitation",
      "Electrical Works": "Electrical",
      "Water & Sewerage": "Water & Sewerage",
      "Accessibility Task Force": "Accessibility",
      "General Maintenance": "General Maintenance",
    }[team];
  };

  // --- issues, reports, events -------------------------------------------
  const event = (issueId: number, kind: string, message: string, at: Date) =>
    q.query("INSERT INTO events (issue_id, kind, message, actor_role, created_at) VALUES ($1, $2, $3, $4, $5)", [
      issueId, kind, message, kind === "created" || kind === "merged" ? "citizen" : "system", at.toISOString(),
    ]);

  let firstG9Resolved: { id: number; lat: number; lng: number } | null = null;
  let closures = 0;
  const FIX_NOTE = "Repaired by the field team.";
  for (const [name, count, resolvedShare] of SEED_PROFILE) {
    const hood = NEIGHBORHOODS.find((n) => n.name === name)!;
    const resolvedCount = Math.round(count * resolvedShare);
    for (let k = 0; k < count; k++) {
      // G-9 gets recurring road damage: the first repair fails and the problem comes back.
      const category: Category = name === "G-9" && k < 4 ? "road_damage" : pick(SEED_CATEGORIES);
      const severity = pick(sevs);
      const text = pick(SEED_TEXT[category]!);
      let lat = hood.lat + (rand() - 0.5) * 0.012;
      let lng = hood.lng + (rand() - 0.5) * 0.014;
      const ageDays = 3 + Math.floor(rand() * 75);
      const created = new Date(now.getTime() - ageDays * 86_400_000);
      const resolved = k < resolvedCount;
      const reportCount = 1 + Math.floor(rand() * rand() * 9);
      const baseStatus = resolved ? "resolved" : rand() < 0.35 ? "assigned" : "open";
      const resolvedAt = resolved
        ? new Date(created.getTime() + (1 + rand() * Math.min(ageDays - 1, 14)) * 86_400_000)
        : null;
      // The workflow behind each finished Issue, without new random draws (so the neglect story stays as it is):
      // an Office is assigned a day after the first Report, records a Fix, and a Citizen confirms it. Every fourth
      // Resolution had a first Fix rejected; every other old Assigned Issue in the better-served sectors was fixed
      // and closed unconfirmed because nobody answered within 7 days.
      const assignedAt = new Date(created.getTime() + 86_400_000);
      const closedUnconfirmed = baseStatus === "assigned" && resolvedShare >= 0.5 && ageDays >= 20 && closures++ % 2 === 0;
      const status = closedUnconfirmed ? "closed_unconfirmed" : baseStatus;
      const span = resolvedAt ? resolvedAt.getTime() - assignedAt.getTime() : 0;
      const between = (share: number) => new Date(assignedAt.getTime() + span * share);
      const rejectedOnce = resolved && k % 4 === 1;
      const fixedAt = resolved ? between(0.7) : closedUnconfirmed ? new Date(created.getTime() + 3 * 86_400_000) : null;
      const closedAt = closedUnconfirmed ? new Date(fixedAt!.getTime() + 7 * 86_400_000) : null;

      let recurrenceOf: number | null = null;
      if (name === "G-9" && k === 3 && firstG9Resolved) {
        recurrenceOf = firstG9Resolved.id;
        lat = firstG9Resolved.lat + 0.0002;
        lng = firstG9Resolved.lng + 0.0002;
      }
      const office =
        status === "open"
          ? null
          : offices
              .filter((o) => o.department === departmentOf(category))
              .sort((a, b) => haversineMeters(lat, lng, a.lat, a.lng) - haversineMeters(lat, lng, b.lat, b.lng))[0] ?? null;
      const cover = photos?.byCategory[category] ?? null;
      const priority = computePriority({
        severity, category, report_count: reportCount, created_at: created.toISOString(),
        status, recurrence_of: recurrenceOf,
      });
      const issueRows: { id: number }[] = await q.query<{ id: number }>(
        `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, constituency, status, priority,
           office_id, report_count, cover_image, after_image, resolution_note, fix_note, recurrence_of, is_demo,
           created_at, updated_at, fixed_at, resolved_at, closed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18,$19,$20,$21,$22) RETURNING id`,
        [
          category, severity, text.split(",")[0], text + ".", lat, lng, name, constituencyFor(name), status,
          priority, office?.id ?? null, reportCount, cover, fixedAt ? (photos?.fixed ?? null) : null,
          resolved ? FIX_NOTE : null, fixedAt ? FIX_NOTE : null, recurrenceOf,
          created.toISOString(), (closedAt ?? resolvedAt ?? created).toISOString(), fixedAt?.toISOString() ?? null,
          resolvedAt?.toISOString() ?? null, closedAt?.toISOString() ?? null,
        ],
      );
      const issueId: number = issueRows[0].id;
      if (name === "G-9" && k === 0) firstG9Resolved = { id: issueId, lat, lng };

      await event(issueId, "created", `Reported by citizen in ${name}`, created);
      for (let j = 0; j < reportCount; j++) {
        const at = new Date(created.getTime() + j * rand() * 2 * 86_400_000);
        const person = pick(personIds);
        await q.query(
          `INSERT INTO reports (issue_id, reporter_id, description, image, lat, lng, ai_category, ai_severity,
             ai_confidence, ai_summary, ai_source, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0.8,$9,'seed',$10)`,
          [
            issueId, person, j === 0 ? text : pick(SEED_TEXT[category]!), cover,
            lat + (rand() - 0.5) * 0.0004, lng + (rand() - 0.5) * 0.0004, category, severity, text, at.toISOString(),
          ],
        );
      }
      if (reportCount > 1)
        await event(issueId, "merged", `${reportCount - 1} duplicate report(s) grouped by AI`, created);
      if (recurrenceOf)
        await event(issueId, "recurring", `Recurring problem: issue #${recurrenceOf} here was repaired before`, created);
      if (office) await event(issueId, "assigned", `Assigned to ${office.name}`, assignedAt);
      if (office && fixedAt) {
        const fixMessage = `Fixed by ${office.name}: ${FIX_NOTE} After-repair photo added.`;
        if (rejectedOnce) {
          await event(issueId, "fixed", fixMessage, between(0.3));
          await event(issueId, "rejected", "Fix rejected by a Citizen who reported this: still broken at one edge.", between(0.4));
        }
        await event(issueId, "fixed", fixMessage, fixedAt);
      }
      if (resolvedAt) await event(issueId, "resolved", "Resolved: a Citizen who reported this confirmed the Fix.", resolvedAt);
      if (closedAt)
        await event(issueId, "closed_unconfirmed", "Closed unconfirmed: no Citizen confirmed or rejected the Fix within 7 days.", closedAt);
    }
  }
}
