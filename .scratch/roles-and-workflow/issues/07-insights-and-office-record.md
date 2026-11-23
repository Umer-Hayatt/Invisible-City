# 07: Insights on the new workflow and Office track record

**What to build:** The public map and Insights reflect the real workflow: a Resolution changes the neighbourhood numbers, public pages show no reporter identity, and Insights shows each Office's track record.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Heatmap, health score, neglected neighbourhoods, recurrence, before/after photos and timeline work with the new statuses
- [ ] Resolved Issues count in resolution rate; Unconfirmed closures are counted separately and do not count as Resolutions
- [ ] Public pages and the map omit reporter identity (tested)
- [ ] Insights table per Office: Issues assigned, Fixes, Rejections, Unconfirmed closures, average days to fix
- [ ] After a Resolution on the deployed site, the neighbourhood numbers change
- [ ] `docs/PLAN.md` steps 8 and 9 are ticked and deployed

## Comments

**23 November 2026, branch `ticket-07-insights-office-record`** (built on `ticket-06-fix-confirmation`, so it needs #1 merged first): built and covered by `tests/insights.api.test.ts`.

- Statuses: `isActive` / `isFinished` in `lib/types.ts`. The heatmap, severity load, the "Open issues" figures, predictive maintenance, the map markers (grey for Closed unconfirmed) and the Authority's "unresolved" filter treat Fixed-and-waiting as still active, and Resolved or Closed unconfirmed as finished. Priority drops to 0 for both finished states.
- Resolution rate counts only Resolutions. Unconfirmed closures are a separate figure (per neighbourhood, city-wide and per Office), never added to open or resolved.
- Recurrence now also looks at Issues Closed unconfirmed in the last 180 days (the repair still happened).
- `/api/stats` returns `offices` (Office track record): Issues held now, Fixes (`fixed` events), Rejections, Resolutions, Unconfirmed closures, average days from the latest Assignment to the latest Fix. Shown as a table on Insights.
- Reporter identity: the public leaderboard used to include each Citizen's display name; it now returns scores only. Tests check that the map, every Issue page and Insights contain no reporter name, email or phone for an ordinary viewer, while an Authority still sees them.
- Demo seed: Resolved Issues now carry a Fix (note, `fixed_at`, `fixed` event, Citizen-confirmed `resolved` event); every fourth had a first Fix rejected; every other Assigned Issue older than 20 days in the better-served sectors was fixed and Closed unconfirmed. No new random draws, so the neglect story is unchanged. The owner needs to re-run the seed for the live Demo data to show this.
- No database migration.

Still for the owner: re-seed the Demo data, confirm on the deployed site that a Resolution moves the neighbourhood numbers, then tick `docs/PLAN.md` steps 8 and 9.
