# HANDOFF (24 November 2026). Read this first.

Hackathon deadline: 28 November 2026. Repo: https://github.com/Umer-Hayatt/Invisible-City, branch main. A teammate works in the same repo: fetch before starting.

## State

- The frontend half of `fixes.docx` (the team's notes with pictures) is DONE: committed as 69047be and pushed to main on 24 November 2026 at the user's request. Pushing main deploys to Vercel; push again only when asked.
- tsc, eslint and all 169 tests pass. `npm run build` passes.
- The Demo data in the shared Supabase database was reseeded on 24 November (69 Issues, one active Critical).
- `fixes.docx` and `~$fixes.docx` are untracked; keep them out of commits.

## Decisions already made by the user (do not ask again)

- Theme comes from the first picture in fixes.docx: lime, charcoal, navy. Rules are in `DESIGN.md`.
- Reporter display names are public to everyone. Email and phone only for Authorities and the assigned Office.
- Citizens see no severity except Critical, no priority number, no neglected sectors, no health score. Authorities keep the priority number and the neglected list.
- "Criminal score" in the notes was read as the Citizen Impact score: computed, hidden, names and counts shown instead. The user has not objected.
- One email per Office; that email signs in and gets the Assignments.

## Remaining: bring back the previous map (asked for by the user on 24 November, do this first)

The user does not like the new map and wants the previous map design back. Not started.

- The old map is in commit 580fea6: `git show 580fea6:components/MapInner.tsx` and `git show 580fea6:app/page.tsx` (map block and legend). It used the colourful Esri street tiles by day, dark grey tiles at night, and round dots with a white ring (bigger dot = more Reports).
- The new map: night tiles forced with the `night` prop, teardrop pins (`components/pin.ts`, `IssuePin` and `pinIcon` in `MapInner.tsx`), a blue tint and desaturated day tiles (`.map-night` and `.leaflet-tile-pane` rules in `app/globals.css`). Used on the home page (also inside step 2 of How it works), Insights, Issue, Report and Authority pages.
- Keep when going back: only Critical may stand out (no low, medium or high colours or legend for Citizens), no health layer, the sector percentages on Insights, the heatmap fix for leaflet.heat 1.x (the old code crashes), and no severity badges in popups except Critical.
- Update the map lines in `DESIGN.md`.

## Remaining: backend (the user said they will do this next)

1. **Office self-registration.** An Office asks for access as a Department with an area; private businesses may register too. Someone approves it (like Access requests).
2. **Authority registration by area.** An Authority registers for one area. PRD says every Authority sees every Issue, and "Authorities limited to areas" is under Later, so ask whether area also limits what they see.
3. **New neglected rule.** Offices record how many workers they have. A sector is neglected when the Offices (or Authority) responsible keep having spare workers and the work is still not done. Then show it on Insights. Today `lib/insights.ts` still uses the old rule and only officials see the list. Ask how "spare" is measured (for example workers minus In progress Issues).
4. **One email per Office on the server.** The screen (`app/admin/offices/page.tsx`) replaces the email by adding the new one then deleting the old ones; the API still accepts several.

Where: `lib/authority.ts`, `lib/roles.ts`, `app/api/access-requests`, `app/api/offices`, `db/migrations` (add 0003), `app/request-access`, `app/super-admin`. Rule changes must also go into `docs/PRD.md`, new words into `GLOSSARY.md`, every string into both `lib/i18n/en.ts` and `ur.ts`.

## Remaining: frontend

1. Registration forms for items 1 and 2 above, plus the worker count field, built with the backend.
2. Real photos: demo Issues show checkered placeholders (`scripts/placeholder-photos.ts`); the home photos in `public/photos` are Wikimedia stand-ins, credited in `components/Footer.tsx` (the hero is a railway crew).
3. Live test of "Speak" in English and Urdu, and of saving an Office email (neither was tried, to avoid changing live data).
4. Phones: the Office track record table on Insights scrolls sideways.
5. Hallmark checker still flags 73 (Home, Insights), 56 and 72 (Insights). They looked like false alarms from inner scrolling lists; left alone.
6. `.impeccable/` still describes the old road-signage design.

## Useful

- Run: PowerShell `$env:Path = "E:\Node;" + $env:Path; npm run dev`, then http://localhost:3000. The "Signed in as" box at the top switches Demo accounts.
- New files: `components/home/Landing.tsx`, `components/Footer.tsx`, `components/PageShell.tsx`, `components/pin.ts`, `public/photos/`. Removed: `components/home/Signage.tsx`, `components/ScrollProgress.tsx`.
- In auto mode, `cat` and `grep` through Bash get rewritten by the rtk hook and blocked; use the Read and Grep tools.

## ALSO READ: branch origin/official-signup

A branch (commit 3296bcb, 24 November) adds Office staff sign-up with Authority approval (/join-office). It overlaps with backend items 1 and 4. Look at it before building Office self-registration. It was started before the lime redesign, so its screens need the new theme.
