/**
 * Loads the demo data into the database in DIRECT_DATABASE_URL (or DATABASE_URL).
 * Re-running replaces the demo rows and leaves real rows alone.
 *   npm run seed            uploads placeholder photos to Cloudinary (needs CLOUDINARY_* in .env.local)
 *   npm run seed -- --no-photos
 */
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { seedDemoData, SeedPhotos } from "../db/seed-data";
import { Category } from "../lib/types";
import { cloudinaryStore } from "../lib/photo-store";
import { setSql, Sql } from "../lib/sql";
import { gradientPng, PLACEHOLDER_COLORS } from "./placeholder-photos";

function loadEnvLocal() {
  const f = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_DATABASE_URL (or DATABASE_URL) in .env.local");
  const pool = new Pool({ connectionString: url, max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
  const client = await pool.connect();
  const q: Sql = {
    async query<T>(text: string, params?: unknown[]) {
      return (await client.query(text, params as unknown[])).rows as T[];
    },
    async tx<T>(fn: (q: Sql) => Promise<T>) {
      await client.query("BEGIN");
      try {
        const r = await fn(q);
        await client.query("COMMIT");
        return r;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    },
  };
  setSql(q);

  let photos: SeedPhotos | undefined;
  if (!process.argv.includes("--no-photos")) {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
    if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary values missing in .env.local (or pass --no-photos)");
    const store = cloudinaryStore({ cloudName, apiKey, apiSecret });
    const urls: Record<string, string> = {};
    for (const [key, [top, bottom]] of Object.entries(PLACEHOLDER_COLORS)) {
      urls[key] = await store.upload(gradientPng(top, bottom), { mediaType: "image/png", publicId: `seed-${key}` });
      console.log("uploaded", key, urls[key]);
    }
    const { fixed, ...byCategory } = urls;
    photos = { byCategory: byCategory as Partial<Record<Category, string>>, fixed };
  }

  await q.tx((t) => seedDemoData(t, { photos }));
  const [{ n }] = await q.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM issues WHERE is_demo");
  console.log(`Seeded ${n} demo Issues.`);
  client.release();
  await pool.end();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
