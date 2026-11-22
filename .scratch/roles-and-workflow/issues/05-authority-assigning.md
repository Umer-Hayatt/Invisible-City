# 05: Authority reviews, flags spam and assigns to an Office

**What to build:** An Authority works a priority queue, opens an Issue, sees each Report with the reporter's contact details, flags spam, and assigns the Issue to one of the suggested Offices, who is emailed. Offices and their staff are managed by Authorities.

**Blocked by:** 03 (and the seeded Offices from 02)

**Status:** ready-for-agent

- [ ] Priority queue, highest first, filterable by status, Category and neighbourhood; Authorities see every Issue in the city
- [ ] Issue review shows each Report with reporter name, email and phone; those details appear only for an Authority or the assigned Office, enforced in the API response shape and tested
- [ ] Spam flag hides a Report; a lone-Report Issue is removed; a Citizen's third flag sets Suspension
- [ ] Suggested Offices of the Issue's Department, nearest first with distance; the Authority chooses; Assign moves the Issue to Assigned
- [ ] Mailer adapter (Gmail SMTP real, recording fake); Assignment emails the Office's staff
- [ ] Offices and staff page: add Offices, add and remove staff by email (one Office per email)
- [ ] `docs/PLAN.md` step 5 is ticked and deployed
