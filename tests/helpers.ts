import fs from "node:fs";
import path from "node:path";
import { PGlite, types } from "@electric-sql/pglite";
import { seedDemoData } from "../db/seed-data";
import { setClock } from "../lib/clock";
import { fakePhotoStore, setPhotoStore } from "../lib/photo-store";
import { Sql, setSql } from "../lib/sql";

const MIGRATIONS = path.join(__dirname, "..", "db", "migrations");

function pgliteSql(db: PGlite): Sql {
  const wrap = (c: Pick<PGlite, "query">, tx: Sql["tx"]): Sql => ({
    async query<T>(text: string, params?: unknown[]) {
      return (await c.query(text, params)).rows as T[];
    },
    tx,
  });
  return wrap(db, (fn) => db.transaction((t) => fn(wrap(t, (f) => f(wrap(t, null as never))))));
}

/**
 * A fresh in-process Postgres with the real migrations, wired in as the app's database, plus the
 * fake adapters: a Photo store that returns one fixed URL and a Clock frozen at NOW.
 * Tests call the real API route handlers and look at what they return.
 */
export const NOW = new Date("2026-11-22T12:00:00Z");

export async function startTestApp(opts: { seed?: boolean } = {}) {
  const pg = new PGlite({ parsers: { [types.TIMESTAMPTZ]: (v: string) => new Date(v).toISOString() } });
  for (const f of fs.readdirSync(MIGRATIONS).sort()) await pg.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  const sql = pgliteSql(pg);
  setSql(sql);
  setClock(NOW);
  const photos = fakePhotoStore();
  setPhotoStore(photos);
  if (opts.seed) await seedDemoData(sql, { now: NOW });
  return { pg, sql, photos, stop: () => pg.close() };
}

export const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never;
