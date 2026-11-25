import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

const MIGRATIONS = path.join(__dirname, "..", "db", "migrations");
const run = (pg: PGlite, f: string) => pg.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));

/** Migration 0007 puts right what the old rules left behind: here, jobs stuck with a Business nobody can sign in as. */
it("reopens the jobs of a Business that is already revoked, and ends their contracts", async () => {
  const pg = new PGlite();
  for (const f of fs.readdirSync(MIGRATIONS).sort().filter((x) => x < "0007")) await run(pg, f);
  const q = async (text: string, params?: unknown[]) => (await pg.query(text, params)).rows as Record<string, unknown>[];
  const office = async (name: string, revoked: boolean) =>
    (await q(
      `INSERT INTO offices (name, department_id, sector, lat, lng, revoked_at)
       VALUES ($1, (SELECT id FROM departments WHERE name = 'Roads'), 'F-7', 33.72, 73.05, $2) RETURNING id`,
      [name, revoked ? "2026-11-24T00:00:00Z" : null],
    ))[0].id as number;
  const job = async (officeId: number, name: string, status: string) => {
    const id = (await q(
      `INSERT INTO issues (category, severity, title, summary, lat, lng, neighborhood, status, priority, report_count, office_id, created_at, updated_at)
       VALUES ('road_damage', 'medium', 'Pothole', 'x.', 33.72, 73.05, 'F-7', $1, 1, 1, $2, now(), now()) RETURNING id`,
      [status, officeId],
    ))[0].id as number;
    await q("INSERT INTO events (issue_id, kind, message, created_at) VALUES ($1, 'assigned', $2, '2026-11-20T00:00:00Z')", [id, "Assigned to " + name]);
    await q(
      "INSERT INTO contracts (issue_id, office_id, authority_name, scope, finish_date, status) VALUES ($1, $2, 'A', 'x', '2030-01-31', 'accepted')",
      [id, officeId],
    );
    return id;
  };
  const gone = await office("Gone Roads", true);
  const here = await office("Here Roads", false);
  const stuck = await job(gone, "Gone Roads", "in_progress");
  const fixed = await job(gone, "Gone Roads", "fixed");
  const fine = await job(here, "Here Roads", "in_progress");

  await run(pg, "0007_review_fixes.sql");

  const state = async (id: number) => (await q("SELECT i.status, i.office_id, c.status AS contract FROM issues i JOIN contracts c ON c.issue_id = i.id WHERE i.id = $1", [id]))[0];
  expect(await state(stuck)).toEqual({ status: "open", office_id: null, contract: "ended" });
  expect(await q("SELECT kind, message, office_id FROM events WHERE issue_id = $1 ORDER BY id", [stuck])).toEqual([
    { kind: "assigned", message: "Assigned to Gone Roads", office_id: gone },
    { kind: "sent_back", message: "Back to Open: Gone Roads no longer works with the city", office_id: gone },
  ]);
  // A Fix waits for the Citizens' answer, and a working Business keeps its jobs.
  expect(await state(fixed)).toEqual({ status: "fixed", office_id: gone, contract: "accepted" });
  expect(await state(fine)).toEqual({ status: "in_progress", office_id: here, contract: "accepted" });
  await pg.close();
});
