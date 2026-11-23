# 09: Demo polish and README

**What to build:** The demo story is walked end to end on the deployed site and rough edges are fixed, and the README describes the real project.

**Blocked by:** 07, 08

**Status:** ready-for-agent

- [ ] Full demo story runs on the live site: report, merge, map, assign, Fix, confirm, insights change, with real emails
- [ ] Each role's screens checked on phone and laptop widths
- [ ] README garbage lines removed; describes Gemini and Groq, the roles, and the setup steps
- [ ] `docs/PLAN.md` step 11 is ticked

## Comments

**23 November 2026, branch `ticket-09-demo-polish`** (built on `ticket-08-urdu`; merge #1, #2, #3 first). What could be done from the code, without the live site:

- Demo seed (`demoStory` in `db/seed-data.ts`): three existing road Issues move to the Demo Office: one Assigned, one In progress, and one Fixed that the Demo Citizen also reported. So Office staff and the Citizen each have something to do from the first click, and the Authority still has Open Issues to assign. No Issue is added (still 69) and no Resolution changes, so the neglect story stays. `tests/demo-story.api.test.ts` plays it with the Demo accounts.
- README: the AI chain (Gemini → Groq → offline guess) and Gemini voice, Gmail, English and Urdu, how an Issue moves, a 3-minute demo story, and an up-to-date build status. The old junk lines at the end were already gone. `docs/SETUP.md` now says the Gemini key also powers voice.

Still for the owner, on the deployed site after `npm run seed`: walk the demo story with real Gmail on a phone and a laptop for each role, then tick `docs/PLAN.md` step 11 (and 6 to 10 as each is confirmed live).
