# 04: Report a problem, with AI and spam rules

**What to build:** A signed-in Citizen reports a problem from a phone: photo, GPS location, adjustable map pin, AI-suggested Category (editable), optional description. Reports merge into Issues, and spam is limited by the rules in the spec's order.

**Blocked by:** 03 (and the photo adapter from 02)

**Status:** ready-for-agent

- [ ] Report is tied to the signed-in Citizen; suspended or incomplete-profile Citizens are refused with a clear message
- [ ] Vision AI adapter: Gemini, then Groq, then the keyword guess; returns Category, severity, confidence, summary and whether it is a civic problem; the Claude code is removed
- [ ] Non-civic photos are refused with a message; the Category can be changed before submitting
- [ ] Limit of 10 Reports per day, tested with the Clock adapter
- [ ] Duplicate check (150 m, merge at 0.6 or more); a Citizen who already reported that Issue sees "already reported" and it does not count twice
- [ ] Recurrence check, then merge or create, in one transaction; priority recomputed
- [ ] A Citizen can delete their own Report only while the Issue is Open
- [ ] On the live site a real photo is classified by Gemini and a second Report of the same spot merges
- [ ] `docs/PLAN.md` step 4 is ticked and deployed
