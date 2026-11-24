# Build plan

Ordered work list for the 28 November 2026 deadline. The rules are in [`PRD.md`](PRD.md). Each step ends with the app working and deployed to Vercel, so if time runs out we lose the last steps, not the core. Mark a step `[x]` when it is done and deployed.

## 0. Prototype (separate session)
- [ ] Clickable `/prototype` page with fake data for the Citizen, Authority, Office and Super Admin screens.
- **Done when:** the team approves the layouts. The prototype is kept in `app/_prototype` (not routed) as a reference for the real screens.

## 1. Accounts and setup
- [ ] Team creates: Google OAuth client, Cloudinary account, project Gmail with app password, Gemini key (and optionally Groq).
- [ ] Claude creates (with approval): Supabase project, Vercel project; sets environment variables, including `SUPER_ADMIN_EMAILS`.
- [ ] Add `dev.log` to `.gitignore`; add `.env.example` listing every variable.
- **Done when:** the current app deploys to Vercel and loads.

## 2. Storage: Supabase and Cloudinary
- [x] Postgres schema for Citizens/profiles, roles, Departments, Offices, office staff, Issues, Reports, events, Access requests, Spam flags.
- [x] Photos uploaded to Cloudinary instead of `data/uploads`.
- [x] Seed script: the ~70 demo Issues (keeping the I-10, G-11, I-9 neglect and G-9 recurrence story), 15–25 Islamabad Offices, Demo accounts, Constituency per sector.
- [x] Remove the SQLite code.
- **Done when:** the map, Issue pages and Insights read from Supabase on the deployed site.

## 3. Sign-in and roles
- [x] Supabase "Sign in with Google"; first-sign-in profile form (display name, `+92` phone).
- [x] Role checks on every page and API route; remove the `admin123` passcode.
- [x] Super Admin from `SUPER_ADMIN_EMAILS`; Request Authority access form and Super Admin approval page.
- [x] Demo mode: role switcher between Demo accounts, "Demo" banner.
- [x] Translation file in place; all new text goes through it.
- **Done when:** each role sees only its own screens, on the deployed site.

## 4. Reporting with spam rules
- [ ] Report flow tied to the signed-in Citizen; phone-first layout (camera, GPS, map pin); Category can be changed before submitting.
- [ ] Gemini → Groq → keyword fallback; remove the Claude code.
- [ ] Refuse non-civic photos; 10 per day limit; "already reported" check; delete only while Open.
- **Done when:** a real photo is classified by Gemini and a second Report of the same spot merges.

## 5. Authority assigning
- [ ] Priority queue with filters; Issue review showing each Report's reporter email and phone.
- [ ] Spam flag (hide Report, remove a single-Report Issue, Suspension at 3).
- [ ] Suggested Offices of the right Department, nearest first; Assign.
- [ ] Offices and staff management page.
- **Done when:** an Authority assigns a demo Issue to a suggested Office.

## 6. Office work
- [ ] My jobs: Start work, Mark fixed (after-photo required), Send back with reason.
- **Done when:** an Office takes an Issue from Assigned to Fixed.

## 7. Citizen confirmation and email
- [ ] My reports: confirm (Resolution) or reject (Rejection) a Fix.
- [ ] Closed unconfirmed after 7 days without an answer.
- [ ] Gmail emails: Assignment to Office, Fix to Citizens, Resolution or closure to Citizens.
- **Done when:** the full demo story runs end to end with real emails arriving.

## 8. Map and insights on the new data
- [ ] Heatmap, health score, neglect, recurrence, before/after and timeline work with the new statuses and roles; public pages show no reporter identity.
- **Done when:** the neighbourhood numbers change after a Resolution.

## 9. Office track record
- [ ] Insights table per Office: assigned, Fixes, Rejections, Unconfirmed closures, average days to fix.

## 10. Urdu
- [ ] Urdu translation file and right-to-left layout.
- [ ] Urdu voice Reports through Gemini (Urdu text plus English translation, shown to Authorities).

## 11. Demo polish
- [ ] Walk the demo story on the deployed site, fix rough edges, update the README (remove the garbage lines at the end, describe Gemini/Groq, setup steps).

## Later
See PRD section 10.

## Fixes of 24 November 2026 (fixes.docx)

- [x] Frontend: new theme on every page, Citizens see only Critical, no health score, reporter names shown to everyone, one email per Office, voice in Urdu or English.
- [ ] Offices register themselves and ask for access, as a Department with an area (private businesses included).
- [ ] Authorities register for one area.
- [ ] Offices record their workers; a sector is neglected when its Offices keep having spare workers and the work is still not done. Show it on Insights.
- [ ] Enforce one email per Office in the API (the screen already does).
- [x] Bring back the previous map design (the user does not like the new one). Details in `docs/HANDOFF.md`.
- [ ] Look at the branch `official-signup` before building Office self-registration: it already has Office staff sign-up.

## Fixes of 24 November 2026, second note (Authority side)

- [x] Authorities work in a sidebar workspace (Dashboard, Reports, Offices, Insights) with no top bar and no map; `/admin` is an overview Dashboard and the work queue moved to `/admin/reports`.
- [x] "Problems by category" moved from Insights to the Dashboard.
- [x] Insights: "Areas with the most Reports" replaces the Citizen leaderboard; Neglected sectors and Problems that keep coming back show their evidence (the Issues waiting longest, the Reports behind each cluster). Idle-worker evidence comes with the worker counts below.
- [x] Office track record on Insights is a list of cards on phones (no sideways scrolling).

## Fixes of 24 November 2026, backend (HANDOFF items 1 to 4)

- [x] Office registration: `/register-office` (Department, sector, private business, workers); any Authority of that Area or of the whole city approves on the Offices screen; approval creates the Office and its one email. Migration `0003_registration_areas_workers.sql`.
- [x] Authority Area: the Access request names a sector or the whole city; an Area Authority sees and acts on that Area only (Issues, Assignments, spam, Offices, registrations, Dashboard).
- [x] Workers: Offices record their workers on My Office; the neglected-sector rule uses spare workers and Issues waiting more than 7 days, with the evidence on Insights.
- [x] One email per Office, enforced by the API (a new email replaces the old; an email on another Office is refused).
