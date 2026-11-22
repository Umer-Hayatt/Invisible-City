# 02: Data in Supabase Postgres and photos in Cloudinary

**What to build:** The map, Issue pages and Insights on the live site read from Supabase Postgres seeded with demo data, and photos are served from Cloudinary. SQLite and local uploads are gone. Tests run the real API against an in-process Postgres (ADR 0003).

**Blocked by:** 01

**Status:** ready-for-agent

Work in three parts, each its own acceptance group. Read the Next.js docs in `node_modules/next/dist/docs/` first.

- [ ] Postgres schema (people, departments, categories, offices, office staff, Access requests, Issues, Reports, events) applied to Supabase as migrations, using the Category → Department table from the spec
- [ ] Plain-SQL data module using the pooler string on Vercel; Vitest with PGlite and the fake adapters in place; an API test lists and reads Issues
- [ ] Seed script: about 70 demo Issues (I-10, G-11, I-9 neglect story, G-9 Recurrence), 15–25 Islamabad Offices, Departments, Demo accounts, sector → Constituency lookup
- [ ] Photo store adapter (Cloudinary real, fixed-URL fake); seed photos uploaded; `data/uploads` and its route removed
- [ ] All SQLite code removed; the deployed map, Issue pages and Insights show the seeded data
- [ ] `docs/PLAN.md` step 2 is ticked and deployed
