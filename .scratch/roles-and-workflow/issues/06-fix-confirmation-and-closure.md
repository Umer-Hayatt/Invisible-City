# 06: Office Fix, Citizen confirmation and closure

**What to build:** Office staff take an assigned Issue to Fixed with an after-photo. The Citizens who reported it are emailed and can confirm (Resolution) or reject (Rejection). An unanswered Fix closes as an Unconfirmed closure after 7 days. The full demo story runs end to end with real emails.

**Blocked by:** 04, 05

**Status:** ready-for-agent

- [ ] My jobs for Office staff shows only their Office's Issues; all staff of an Office see the same jobs
- [ ] Start work and Send back (with reason, Issue returns to Open) work; other Offices and roles get "forbidden"
- [ ] Mark fixed requires an after-photo and allows a note; the Issue becomes Fixed and every reporting Citizen is emailed
- [ ] My reports for Citizens with timeline and after-photo; confirm gives Resolved and an email; reject with a comment returns the Issue to In progress with the comment shown to the Office
- [ ] Closed unconfirmed 7 days after the Fix, applied when Issues are read (optional daily cron), tested with the Clock adapter, with an email
- [ ] Every row of the state machine table is tested, allowed and refused; illegal commands return "conflict"
- [ ] `docs/PLAN.md` steps 6 and 7 are ticked and deployed

## Comments

**23 November 2026, branch `ticket-06-fix-confirmation`:** built and covered by `tests/workflow.api.test.ts` (plus the role matrix in `tests/roles.api.test.ts`):

- Office commands: `POST /api/issues/[id]/start`, `/send-back` (reason), `/fix` (multipart `afterImage` required, optional `note`). Staff of another Office get "forbidden"; the right Office at the wrong moment gets "conflict".
- Citizen commands: `POST /api/issues/[id]/confirm` and `/reject` (comment). Only a Citizen with a counted Report on the Issue may answer.
- The 7-day Unconfirmed closure runs lazily before every Issue read and every command (`lib/closure.ts`); `closed_at` is the moment the 7 days ran out. No cron was added.
- Emails: Fix, Resolved and Closed unconfirmed to every reporting Citizen; Demo Issues send none.
- The temporary Authority "Resolve with proof" route (`/api/issues/[id]/resolve`) is removed: only an Office records a Fix and only a reporting Citizen confirms it.
- No database migration: the columns (`fixed_at`, `closed_at`, `fix_note`) were already in 0001. A rejection's comment lives on the public timeline (`events.kind = 'rejected'`) and My jobs shows the latest one while the Issue is In progress.

Still for the owner: the live check with real Gmail (the full demo story), then ticking `docs/PLAN.md` steps 6 and 7. Note for ticket 09: the seed gives the Demo Office no Assigned jobs, so the demo story starts with the Demo Authority assigning one.
