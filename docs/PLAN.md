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

## Businesses and Super Admin directory (24 November 2026, third note), part 1

- [x] Offices are called Businesses on every screen (English and Urdu); the code and database keep "office".
- [x] Business workspace with a sidebar: Jobs, My Business (details and workers).
- [x] Super Admin workspace with a sidebar: Access requests, Authorities, Businesses, Insights; revoke any Authority or Business. Migration `0004_revoke_access.sql`.
- [x] Citizens see only the map, Report and My reports; Insights is for Authorities and the Super Admin.

## Businesses, part 2: jobs, chat and calls

- [x] Available jobs: a Business sees the Open Issues of its Department in its sector and asks for one, with a note. The area's Authorities are emailed.
- [x] Job requests tab for Authorities (their area only): assign, decline, chat, call. Assigning accepts that request and declines the others.
- [x] Chat per Issue and Business, between that Business and the area's Authorities (refreshes every 5 seconds); also on the Business's assigned jobs.
- [x] Call and Email buttons; a Business phone (from its registration, editable on My Business). Migration `0005_job_requests_chat.sql`.

## Assignment by agreement (25 November 2026)

- [x] Authorities no longer assign: the Assign API is gone. They send a Contract from Reports or a Job request; the Business accepts (the Issue is then Assigned) or declines with a reason; the Authority can withdraw. Contracts pages for both, emails, a Demo contract waiting for the Demo Business. Migration `0006_contracts.sql` (applied).

## Fixes from the architecture review (25 November 2026)

Branch `review-bug-fixes`, migration `0007_review_fixes.sql` (applied to the live Supabase 25 November). Merged and deployed, and the Demo reseeded, on 25 November. The review's refactors wait until after the hackathon.

- [x] The Demo never sends email (revoking an Authority or a Business, deciding a registration).
- [x] A flagged or withdrawn Report's photo is no longer the Issue's cover.
- [x] Only an Authority's current Area counts for emails and chat contacts.
- [x] A rejected Fix by a revoked Business goes back to Open.
- [x] Fixes and Rejections count for the Business that made the Fix.
- [x] Contracts end when the Issue leaves the Business, and are withdrawn when it is removed.
- [x] Demo Issues go to the Department of their Category (the database decides).
- [x] From the code review: the Super Admin's list counts Fixes as Insights does; a Revocation in progress is waited out when a contract is sent or answered; 0007 also reopens jobs already stuck with a revoked Business.

## Businesses, part 3: the rest of contracts (not started)

- [ ] Migration 0008: payment status (agreed, paid, paid at) on contracts.
- [ ] Send a contract from the chat too.
- [x] Contract PDF on the server (A4, both parties, Issue with photo, terms, price, dates, acceptance record, signature lines; "not legally binding by itself").
- [x] PDF emailed to both sides on Send and on Accept (mailer attachments).
- [ ] Payment recorded: the Authority marks it Paid after the Fix is confirmed.

## Demo of one area (agreed 25 November 2026)

Today the Demo Authority covers the whole city and there is one Demo Business. The Demo will show one area (a sector) instead, working as it does for real people.

- [x] The Demo Authority is approved for one area only, and sees and acts only on the Reports and Businesses of that area. Suggested: G-9, where the Demo Business already is.
- [x] Three Demo Businesses in the role switcher instead of one, each of a different Department, all in the Demo Authority's area. Suggested: Roads, Sanitation, Electrical.
- [x] Each Demo Business sees only the jobs of its own Department and area.
- [x] Demo seed: enough Issues in that area for each of the three (available, Assigned, In progress, Fixed) and a Contract waiting for an answer, so every Business has something to do.
- [x] Remove Insights for Authorities, in the Demo and for real ones: the sidebar link, the page and `/api/stats` become Super Admin only. Check what else on the Authority dashboard reads `/api/stats` first. Replaces the earlier rule "Insights is for Authorities and the Super Admin" (PRD, HANDOFF).
- [x] Role switcher text in English and Urdu; PRD section 8 (Demo mode), README and the Demo tests updated.
- [ ] Deploy, then reseed the live Demo (`npm run seed`).

## Review of 25 November 2026

- [x] Reporter email and phone only for an Authority of the Issue's Area (or of the whole city).
- [x] Insights API (`/api/stats`) refuses everyone but Authorities and the Super Admin; the home page uses `/api/city`.
- [x] A revoked Business can be restored by the Super Admin, or register again.
- [x] City map for Citizens: Example Issues and figures while there are fewer than 20 real Issues.

## Still open from earlier notes

- [ ] Real photos (Demo Issues use placeholders; home photos are Wikimedia stand-ins).
- [ ] Live test of Speak and of Business emails on the deployed site (owner).
- [ ] Hallmark checker flags 73, 56, 72 (likely false alarms).
- [ ] Refresh `.impeccable/` (still the old road-signage design).
- [ ] Show an Issue's Job requests on the Authority's Reports page too.

## Civora frontend redesign (27 November 2026), branch `civora-design`

Asked by the user: premium SaaS look (Linear, Stripe, Vercel, Mercury), shadcn/ui, palette navy #172B4D, royal blue #2563EB actions, teal #14B8A6 accents, off-white #F8FAFC, white cards, text #0F172A / #64748B, borders #E2E8F0, Geist font, no new animation libraries (animations come later), no backend/API/auth changes. The user wrote "Civore"; the app is named **Civora** (Umer renamed it); ask before changing.

Done (pushed to `civora-design`, commit 0fd547a and after):
- [x] Colour tokens in `app/globals.css` (old lime/charcoal names renamed to action/navy everywhere); dark mode from the same navy.
- [x] Geist and Geist Mono in `app/layout.tsx`.
- [x] shadcn/ui primitives in `components/primitives/` (not components/ui: `components/ui.tsx` already exists); `lib/utils.ts` cn(); `components.json`. Overlay z-index raised to 1100 (above the map and bars).
- [x] `components/ui.tsx` restyled: light PageHeader, cards, buttons, fields, soft status badges, Stat, Empty, new Tag.
- [x] Light top bar for Citizens (shadcn Sheet on phones, avatar menu `components/UserMenu.tsx`); light sidebar `components/WorkspaceShell.tsx` for Authority, Business, Super Admin. Demo banner pinned with `--banner` height.
- [x] Headings semibold instead of bold.
- [x] `components/DataTools.tsx`: SearchInput, matches(), usePaged + Pager, ConfirmDialog, Alert.
- [x] Super Admin Businesses page: table with status tabs, type filter, search, pagination, row action menu and confirm dialog.

Still to do on this branch (in this order):
- [x] Super Admin Authorities page: same table pattern as Businesses (search, Active/Revoked tabs, pagination, ConfirmDialog instead of window.confirm).
- [x] Super Admin Access requests page: tabs Pending/Decided, approve/decline with ConfirmDialog.
- [x] Authority Businesses page (`app/admin/offices`): table with search and pagination; registrations list.
- [x] Authority Reports queue: search and pagination. Job requests and Contracts already had status tabs (Umer); no search yet (short lists).
- [x] Business pages (Jobs, Available jobs, Contracts, My Business): check spacing on phone and laptop.
- [x] Home page: the "Active repairs" navy band could become a light section with white cards; check the hero buttons.
- [x] Replace remaining `window.confirm` calls with ConfirmDialog (grep window.confirm).
- [x] Checked in the preview (phone 375px, laptop, dark mode); tsc, eslint, 253 tests pass; PR opened into main (no migration needed).
- [x] DESIGN.md rewritten for the Civora system.
- [ ] Refresh `.impeccable/` (still the old design).
- [ ] Animations (later phase): reveals, counters, page transitions, map interactions.

## Civora motion (27 November 2026), branch `civora-motion`

- [x] Animation system: `lib/motion.ts` tokens and `components/animate/` components; PageTransition on every route; Lenis on public pages only.
- [x] Home page: word-by-word hero, photo ease-in and parallax, eyebrow labels, scroll reveals, clip-reveal step images, light figures section with count-up cards, closing call reveal, scroll progress bar.
- [x] Citizen: report steps arrive in turn; My reports cards stagger and glide.
- [x] Workspace: sliding sidebar indicator, dashboard figures and growing category bars, staggered request, contract and job lists, chat messages slide in.
- [x] Fixed: the chart colour token renamed by mistake in #16 (grey "open" bars were invisible).
- [ ] Insights page (Super Admin): reveal its sections and bars like the dashboard.
- [ ] Issue page: reveal the before/after photos and the timeline with the shared components (it still uses the older CSS `stagger` class).
- [ ] Refresh `.impeccable/`.
