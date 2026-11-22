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
