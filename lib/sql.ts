import { Pool, types } from "pg";

/**
 * The only door to Postgres. Plain SQL with $1, $2 placeholders (ADR 0003).
 * Real: a `pg` pool on DATABASE_URL (Supabase transaction pooler on Vercel).
 * Tests swap in PGlite through `setSql`.
 */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs `fn` in one transaction; every query inside must use the `Sql` it is given. */
  tx<T>(fn: (q: Sql) => Promise<T>): Promise<T>;
}

// timestamptz -> ISO string, so API JSON matches what the screens already expect.
types.setTypeParser(1184, (v) => new Date(v).toISOString());

type Runner = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

function wrap(c: Runner, tx: Sql["tx"]): Sql {
  return {
    async query<T>(text: string, params?: unknown[]) {
      return (await c.query(text, params)).rows as T[];
    },
    tx,
  };
}

function pgSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see docs/SETUP.md)");
  const pool = new Pool({
    connectionString: url,
    max: 3,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
  });
  return wrap(pool as unknown as Runner, async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inner: Sql = wrap(client as unknown as Runner, (f) => f(inner)); // no nesting: reuse this transaction
      const r = await fn(inner);
      await client.query("COMMIT");
      return r;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  });
}

const g = globalThis as unknown as { __icSql?: Sql };

export function sql(): Sql {
  return (g.__icSql ??= pgSql());
}

/** Tests and scripts: use this connection instead of DATABASE_URL. */
export function setSql(s: Sql | null) {
  g.__icSql = s ?? undefined;
}
