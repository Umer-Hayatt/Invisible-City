# HANDOFF (25 November 2026). Read this first.

Hackathon deadline: 28 November 2026. Repo: https://github.com/Umer-Hayatt/Invisible-City. Commit and push straight to `main`. Make a branch or pull request only when the owner (Umer) asks for one. The owner deploys and applies database migrations to the live Supabase.

## Pull requests and what to do with each (in this order)

| PR | Branch | What it is | Action |
|---|---|---|---|
| #12 | `fixes-authority-dashboard` | Authority dashboard and sidebar, previous map back, Insights evidence | **Merged** 24 November |
| #13 | `fixes-registration` | Office registration, Authority areas, worker counts and new neglect rule, one email per Office | **Merged**; migration 0003 applied 25 November |
| #14 | `business-workspace` | Office renamed Business on screen, Business and Super Admin sidebars, revoke access, Citizens without Insights | **Merged**; migration 0004 applied 25 November |
| #15 | `business-jobs` | Available jobs, Job requests, chat per job, Call buttons, Business phone | **Merged**; migration 0005 applied 25 November |
| #11 | `official-signup` | Old Office staff sign-up | **Close without merging.** #13 replaces it and its migration also uses the number 0003 |

Migrations 0001 to 0007 are applied to the live Supabase and the Demo data was reseeded on 25 November. **Always apply a migration before merging the code that needs it**: #13 to #15 were merged first, and sign-in and the Demo accounts failed on the live site until it was done.
Never change a session setting (`SET ...`) through `DATABASE_URL`: it is the transaction pooler, and the setting stays on a shared connection the live site uses. Use `SET LOCAL` inside a transaction.
Branch `fixes-live-review` (25 November, no migration): contact details by Area, Insights API for officials only, restoring a Business, Example Issues on the city map. Details in `docs/PLAN.md`.
Branch `contract-agreement` (25 November, migration 0006, applied to the live Supabase 25 November): Authorities no longer assign; they send a Contract and the Issue is Assigned only when the Business accepts. Rules in `docs/PRD.md`, "Assignment by agreement"; code in `lib/contracts.ts`.
Branch `review-bug-fixes` (25 November, migration 0007, applied to the live Supabase 25 November): seven bugs found by the architecture review, and what its code review found; list in `docs/PLAN.md`. Merged, deployed and the Demo reseeded.
Security: the Supabase database password, the Cloudinary secret and the Gemini key were pasted in a chat on 24 November. **Rotate all three.**

## Decisions already made by the user (do not ask again)

- Theme: lime, charcoal, navy (`DESIGN.md`).
- Reporter display names are public; email and phone only for Authorities and the assigned Business.
- **Office is called Business on every screen** (government or private). The code and database keep `office`/`offices`.
- An Authority is approved by the Super Admin for **one area** (a sector) or the whole city, and sees and acts only on that area.
- Businesses register themselves (`/register-office`); **any Authority of that area** (or a whole-city one) approves. Private firms pick a Department like any Business.
- **Spare workers** = workers minus Assigned and In progress jobs. A sector is neglected when its Businesses have spare workers while Issues wait more than 7 days.
- One email per Business, enforced by the API.
- The Super Admin sees every Authority and Business and can **revoke** either at any time.
- **Citizens see only the map (home), Report and My reports.** Insights is for Authorities and the Super Admin.
- Authorities, Businesses and the Super Admin each work in a **sidebar workspace** (no top bar, no footer).
- Contracts: the app makes a formatted PDF the Business accepts in the app; payment is **recorded** (agreed, paid), never moved. The PDF does not claim to be legally binding by itself.
- Calls are `tel:` links (the phone's dialer), not in-app calling.

## Civora motion (27 November 2026), branch `civora-motion`

- [x] Animation system: `lib/motion.ts` tokens and `components/animate/` components; PageTransition on every route; Lenis on public pages only.
- [x] Home page: word-by-word hero, photo ease-in and parallax, eyebrow labels, scroll reveals, clip-reveal step images, light figures section with count-up cards, closing call reveal, scroll progress bar.
- [x] Citizen: report steps arrive in turn; My reports cards stagger and glide.
- [x] Workspace: sliding sidebar indicator, dashboard figures and growing category bars, staggered request, contract and job lists, chat messages slide in.
- [x] Fixed: the chart colour token renamed by mistake in #16 (grey "open" bars were invisible).
- [x] Insights page (Super Admin): sections rise in, the finding columns arrive in turn, each sector has a fix-rate bar that grows under its name.
- [x] Issue page: the title reveals word by word, the photo settles, before/after photos clip-reveal, the timeline steps arrive in turn.
- [ ] Refresh `.impeccable/`.

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

## Remaining work

### Part 3: the rest of contracts (next)
Steps 1 to 3 (table, send, accept or decline) are done on `contract-agreement`: `lib/contracts.ts`, `components/ContractForm.tsx`, `components/ContractCard.tsx`, `/admin/contracts`, `/office/contracts`. The contract number is its id. Not done: payment columns (agreed / paid, paid at) in a migration `0008`, and drafts (a contract is written and sent in one step).
4. PDF: generated on the server (for example with `pdf-lib`), A4, the Invisible City header, contract number, both parties (Business name, type, Department, sector, email, phone; Authority name, area, email, phone), the Issue (title, category, location, photo, Report count), scope, price, dates, payment terms, acceptance record, and signature lines. Footer: "Generated by Invisible City; not legally binding by itself."
5. Email the PDF to both sides on Send and on Accept (`lib/mailer.ts` needs attachment support).
6. Payment: the Authority marks a contract **Paid** after the Fix is confirmed; shown on both sides and to the Super Admin.
7. Tests, PRD, GLOSSARY (Contract), Urdu text.

### Other items still open
- Real photos: Demo Issues use placeholders (`scripts/placeholder-photos.ts`); home photos are Wikimedia stand-ins credited in `components/Footer.tsx`.
- Live test of Speak (English and Urdu) and of Business emails on the deployed site (Umer).
- Hallmark checker flags 73 (Home), 56 and 72 (Insights): looked like false alarms from inner scrolling lists.
- `.impeccable/` still describes the old road-signage design; refresh it with the impeccable document command.
- The Authority Reports page does not yet show Job requests for the selected Issue; they are on the separate Job requests tab.
- Chat refreshes every 5 seconds (polling). Real-time (Supabase Realtime) would be nicer but is not needed for the demo.

## Useful

- Local checks before every PR: `npx tsc --noEmit`, `node node_modules/eslint/bin/eslint.js app lib components tests`, `npm test`.
- Run: PowerShell `$env:Path = "E:\Node;" + $env:Path; npm run dev`, then http://localhost:3000. The "Signed in as" box switches Demo accounts (Citizen, Authority, Business, Super Admin).
- Keep `dev.log`, the root `HANDOFF.md`, `fixes.docx` and `.env*` out of commits. Never paste secrets.
- Main files: `lib/roles.ts` (roles and area), `lib/authority.ts` (Offices, staff, Assignment), `lib/registration.ts`, `lib/directory.ts` (Super Admin lists and revoke), `lib/jobs.ts` (available jobs, Job requests, chat), `lib/insights.ts` (neglect rule), `components/WorkspaceShell.tsx` (sidebars).
