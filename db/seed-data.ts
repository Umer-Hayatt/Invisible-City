import { DEMO_ACCOUNTS, DEMO_AREA, DEMO_BUSINESSES } from "../lib/demo-accounts";
import { constituencyFor, haversineMeters, NEIGHBORHOODS } from "../lib/geo";
import { computePriority } from "../lib/scoring";
import { Sql } from "../lib/sql";
import { Category, Severity } from "../lib/types";

/**
 * Demo data: ~70 Issues with the neglect story (I-10, G-11, I-9 resolve almost nothing) and the
 * G-9 recurrence, 21 fictional Offices, and Demo accounts. Deterministic, so demos are repeatable.
 * The Demo shows one area, G-9: its Authority is approved for G-9 only, and a Roads, a Sanitation and an Electrical
 * Business work there, each with jobs of every kind.
 * Everything seeded is flagged is_demo so `clearDemoData` can remove it without touching real rows.
 */

export { DEMO_ACCOUNTS };

/** [name, department, sector]: positions come from the sector centre. */
const OFFICES: [string, string, string][] = [
  // The first Office is the Demo Roads Business; the last two are the Demo Sanitation and Electrical Businesses.
  ["Roads Sub-division G-9", "Roads", "G-9"],
  ["Roads Sub-division F-7", "Roads", "F-7"],
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
  ["General Maintenance G-10", "General Maintenance", "G-10"],
  ["General Maintenance I-8", "General Maintenance", "I-8"],
  ["Sanitation Depot G-9", "Sanitation", "G-9"],
  ["Electrical Works G-9", "Electrical", "G-9"],
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
  await q.query("DELETE FROM office_registrations WHERE is_demo");
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
  const offices: { id: number; name: string; department: string; sector: string; lat: number; lng: number }[] = [];
  // The Offices of the neglected sectors have workers sitting idle while Issues wait: that is the neglect.
  const IDLE_SECTORS = ["I-10", "G-11", "I-9"];
  for (const [name, department, sector] of OFFICES) {
    const hood = NEIGHBORHOODS.find((n) => n.name === sector)!;
    const lat = hood.lat + 0.0015;
    const lng = hood.lng - 0.0015;
    const workers = IDLE_SECTORS.includes(sector) ? 6 : 0;
    const [o] = await q.query<{ id: number }>(
      `INSERT INTO offices (name, department_id, sector, lat, lng, is_demo, workers, phone)
       VALUES ($1, (SELECT id FROM departments WHERE name = $2), $3, $4, $5, true, $6, $7) RETURNING id`,
      [name, department, sector, lat, lng, workers, `+92 51 ${String(9100000 + offices.length * 1111).slice(0, 7)}`],
    );
    offices.push({ id: o.id, name, department, sector, lat, lng });
  }
  // Each Demo Business account works for its own Office in G-9; the Demo Authority is approved for G-9 only.
  for (const b of DEMO_BUSINESSES) {
    const office = offices.find((o) => o.name === b.name)!;
    await q.query("INSERT INTO office_staff (office_id, email) VALUES ($1, $2)", [office.id, DEMO_ACCOUNTS[b.key].email]);
  }
  await q.query(
    `INSERT INTO access_requests (name, department_id, official_email, phone, decision, decided_by, decided_at, is_demo, area)
     VALUES ($1, (SELECT id FROM departments WHERE name = 'General Maintenance'), $2, $3, 'approved', $4, $5, true, $6)`,
    [DEMO_ACCOUNTS.authority.name, DEMO_ACCOUNTS.authority.email, DEMO_ACCOUNTS.authority.phone, DEMO_ACCOUNTS.superAdmin.email, now.toISOString(), DEMO_AREA],
  );

  // NGOs: one the Super Admin approved, working in G-9 (it is suggested for G-9's rubbish), and one waiting for the
  // Super Admin to check its registration number. Neither holds an Issue, so the rest of the Demo is unchanged.
  const g9 = NEIGHBORHOODS.find((n) => n.name === DEMO_AREA)!;
  await q.query(
    `INSERT INTO offices (name, department_id, sector, lat, lng, is_demo, workers, phone, is_ngo, registration_number, website)
     VALUES ($1, (SELECT id FROM departments WHERE name = 'Sanitation'), $2, $3, $4, true, 25, $5, true, $6, $7)`,
    ["Clean Islamabad Trust", DEMO_AREA, g9.lat - 0.002, g9.lng + 0.002, "+92 51 9133330", "ICT-SWD-2019-0412", "https://example.org/clean-islamabad"],
  );
  await q.query(
    `INSERT INTO office_registrations (name, department_id, sector, workers, contact_name, email, phone, is_demo, created_at,
                                       is_ngo, registration_number, website, about)
     VALUES ($1, (SELECT id FROM departments WHERE name = 'Sanitation'), $2, 40, $3, $4, $5, true, $6, true, $7, $8, $9)`,
    [
      "Green Hands Foundation",
      DEMO_AREA,
      "Ayesha Siddiqui",
      "greenhands.demo@invisible.city",
      "+92 300 0000007",
      new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      "SECP-NPO-2021-1187",
      "https://example.org/green-hands",
      "Volunteers who clear rubbish and blocked drains in G-9 and G-10 every weekend.",
    ],
  );

  // The database decides which Department handles a Category, as it does for real Issues.
  const departments = await q.query<{ key: Category; department: string }>(
    "SELECT c.key, d.name AS department FROM categories c JOIN departments d ON d.id = c.department_id",
  );
  const departmentOf = (c: Category) => departments.find((d) => d.key === c)!.department;

  // --- issues, reports, events -------------------------------------------
  const event = (issueId: number, kind: string, message: string, at: Date, officeId: number | null = null) =>
    q.query("INSERT INTO events (issue_id, kind, message, actor_role, created_at, office_id) VALUES ($1, $2, $3, $4, $5, $6)", [
      issueId, kind, message, kind === "created" || kind === "merged" ? "citizen" : "system", at.toISOString(), officeId,
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
      const rolled = pick(sevs);
      const text = pick(SEED_TEXT[category]!);
      // Critical is kept for an immediate danger; anything else tops out at high.
      const severity: Severity = rolled === "critical" && !/exposed wires|sewage/.test(text) ? "high" : rolled;
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
      // The Demo Businesses of G-9 only ever hold Issues of G-9, so each sees just its own area's jobs.
      const sameDepartment = offices.filter((o) => o.department === departmentOf(category));
      const inArea = sameDepartment.filter((o) => (o.sector === DEMO_AREA) === (name === DEMO_AREA));
      const office =
        status === "open"
          ? null
          : (inArea.length ? inArea : sameDepartment).sort(
              (a, b) => haversineMeters(lat, lng, a.lat, a.lng) - haversineMeters(lat, lng, b.lat, b.lng),
            )[0] ?? null;
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
      if (office) await event(issueId, "assigned", `Assigned to ${office.name}`, assignedAt, office.id);
      if (office && fixedAt) {
        const fixMessage = `Fixed by ${office.name}: ${FIX_NOTE} After-repair photo added.`;
        if (rejectedOnce) {
          await event(issueId, "fixed", fixMessage, between(0.3), office.id);
          await event(issueId, "rejected", "Fix rejected by a Citizen who reported this: still broken at one edge.", between(0.4), office.id);
        }
        await event(issueId, "fixed", fixMessage, fixedAt, office.id);
      }
      if (resolvedAt) await event(issueId, "resolved", "Resolved: a Citizen who reported this confirmed the Fix.", resolvedAt, office?.id);
      if (closedAt)
        await event(issueId, "closed_unconfirmed", "Closed unconfirmed: no Citizen confirmed or rejected the Fix within 7 days.", closedAt, office?.id);
    }
  }

  await demoArea(q, now, offices, personIds, photos);
}

/**
 * Gives every Demo account something to do from the first click, in the one area of the Demo, G-9. For each of the
 * three Demo Businesses (Roads, Sanitation, Electrical) it adds Issues of that Department:
 * - two Open ones, which the Business can see in Available jobs and ask for;
 * - one Assigned, for the Business to Start work or Send back;
 * - one In progress, for the Business to Mark fixed;
 * - one Fixed, waiting for a Citizen to confirm or reject (the Roads one also has the Demo Citizen's Report);
 * - one Open one with a contract waiting for the Business to accept or decline.
 * The Demo Authority, approved for G-9 only, sees all of them and nothing outside G-9.
 */
async function demoArea(
  q: Sql,
  now: Date,
  offices: { id: number; name: string }[],
  personIds: string[],
  photos?: SeedPhotos,
) {
  const hood = NEIGHBORHOODS.find((n) => n.name === DEMO_AREA)!;
  const [{ id: citizenId }] = await q.query<{ id: string }>("SELECT id FROM people WHERE auth_id = 'demo-citizen'");
  const [{ id: authorityId, display_name: authorityName }] = await q.query<{ id: string; display_name: string }>(
    "SELECT id, display_name FROM people WHERE auth_id = 'demo-authority'",
  );
  const day = 86_400_000;
  const at = (ms: number) => new Date(ms).toISOString();
  const dateIn = (days: number) => at(now.getTime() + days * day).slice(0, 10);
  let n = 0;

  type Status = "open" | "assigned" | "in_progress" | "fixed";
  const add = async (category: Category, status: Status, office: { id: number; name: string }, withCitizen = false) => {
    const i = n++;
    const texts = SEED_TEXT[category]!;
    const text = texts[i % texts.length];
    const severity: Severity = i % 3 === 0 ? "high" : "medium";
    const lat = hood.lat + ((i % 6) - 2.5) * 0.0013;
    const lng = hood.lng + (Math.floor(i / 6) - 1) * 0.0016;
    const created = now.getTime() - (4 + i) * day;
    const assignedAt = created + day;
    const startedAt = assignedAt + (now.getTime() - assignedAt) * 0.3;
    const fixedAt = now.getTime() - 6 * 3_600_000; // well inside the 7 days for an answer
    const held = status !== "open";
    const reports = withCitizen ? 2 : 1;
    const cover = photos?.byCategory[category] ?? null;
    const note = "Fixed and checked by the field team.";
    const [issue] = await q.query<{ id: number }>(
      `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, constituency, status, priority,
         office_id, report_count, cover_image, after_image, fix_note, is_demo, created_at, updated_at, fixed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,$17,$18) RETURNING id`,
      [
        category, severity, text.split(",")[0], text + ".", lat, lng, DEMO_AREA, constituencyFor(DEMO_AREA), status,
        computePriority({ severity, category, report_count: reports, created_at: at(created), status, recurrence_of: null }),
        held ? office.id : null, reports, cover, status === "fixed" ? (photos?.fixed ?? null) : null,
        status === "fixed" ? note : null, at(created),
        at(status === "fixed" ? fixedAt : status === "in_progress" ? startedAt : held ? assignedAt : created),
        status === "fixed" ? at(fixedAt) : null,
      ],
    );
    const ev = (kind: string, message: string, when: number, role: string, officeId: number | null = office.id) =>
      q.query("INSERT INTO events (issue_id, kind, message, actor_role, created_at, office_id) VALUES ($1,$2,$3,$4,$5,$6)", [
        issue.id, kind, message, role, at(when), officeId,
      ]);
    await ev("created", `Reported by citizen in ${DEMO_AREA}`, created, "citizen", null);
    if (held) await ev("assigned", `Assigned to ${office.name}`, assignedAt, "authority");
    if (status === "in_progress" || status === "fixed") await ev("in_progress", `Work started by ${office.name}`, startedAt, "office");
    if (status === "fixed") await ev("fixed", `Fixed by ${office.name}: ${note} After-repair photo added.`, fixedAt, "office");
    for (let r = 0; r < reports; r++) {
      await q.query(
        `INSERT INTO reports (issue_id, reporter_id, description, image, lat, lng, ai_category, ai_severity,
           ai_confidence, ai_summary, ai_source, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0.8,$9,'seed',$10)`,
        [
          issue.id, r === 1 ? citizenId : personIds[i % personIds.length],
          r === 1 ? "Same problem, still there on my way to work." : text,
          cover, lat + r * 0.0001, lng + r * 0.0001, category, severity, text, at(created + r * (day / 2)),
        ],
      );
    }
    return issue.id;
  };

  const scopes: Record<string, string> = {
    Roads: "Clear the footpath of everything blocking it, repair the broken paving and leave it safe to walk on.",
    Sanitation: "Clear the dumped waste, haul it away and leave the spot clean.",
    Electrical: "Replace the failed lamps, check the feeder circuit and leave the lane lit.",
  };
  const contractCategory: Record<string, Category> = { Roads: "blocked_footpath", Sanitation: "garbage", Electrical: "streetlight" };
  const mainCategory: Record<string, Category> = { Roads: "road_damage", Sanitation: "garbage", Electrical: "streetlight" };

  for (const b of DEMO_BUSINESSES) {
    const office = offices.find((o) => o.name === b.name)!;
    const category = mainCategory[b.department];
    await add(category, "open", office);
    await add(category, "open", office);
    await add(category, "assigned", office);
    await add(category, "in_progress", office);
    await add(category, "fixed", office, b.department === "Roads"); // the Demo Citizen answers the Roads one
    const offered = await add(contractCategory[b.department], "open", office);
    await q.query(
      `INSERT INTO contracts (issue_id, office_id, authority_id, authority_name, scope, price_pkr, start_date, finish_date, payment_terms, sent_at)
       VALUES ($1,$2,$3,$4,$5,85000,$6,$7,$8,$9)`,
      [
        offered, office.id, authorityId, authorityName, scopes[b.department], dateIn(2), dateIn(9),
        "Paid in full after the Citizens confirm the Fix.", at(now.getTime() - 3 * 3_600_000),
      ],
    );
  }
}
