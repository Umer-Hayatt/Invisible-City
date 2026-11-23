# INvisible City - See the unseen. Fix the forgotten.

Civic-problem reporting for Islamabad. A Citizen reports a problem with a photo and a location, AI reads and de-duplicates it, an Authority sends it to the Office that can fix it, the Office records a Fix with an after-repair photo, and the Citizen confirms it. Public pages show the map and neighbourhood insights without exposing who reported what.

Live site: <https://invisible-city-umer-hayatt.vercel.app> (Demo mode is on, so anyone can try every role).

## Documents

| File | What it is |
|---|---|
| [`GLOSSARY.md`](GLOSSARY.md) | The domain language (Citizen, Authority, Office, Issue, Report, Fix, Resolution...). Code, UI text and docs use these terms. |
| [`docs/PRD.md`](docs/PRD.md) | What the product does and the rules agreed with the team. |
| [`docs/PLAN.md`](docs/PLAN.md) | The ordered build list, ticked as steps are deployed. |
| [`docs/SETUP.md`](docs/SETUP.md) | Accounts and environment variables (Google OAuth, Supabase, Cloudinary, Gmail, Gemini). |
| [`docs/adr/`](docs/adr) | Why the stack and sign-in look the way they do. |
| [`.scratch/`](.scratch) | Specs and tickets, kept in the repo. |

## Stack

- **One Next.js 16 app** (App Router, React 19, Tailwind 4) on Vercel; its API routes are the backend.
- **Supabase Postgres** for data, reached with plain SQL through `pg` (`lib/sql.ts`, `lib/db.ts`). Supabase Auth handles **Sign in with Google**.
- **Cloudinary** for photos.
- **Gmail** (app password, through `nodemailer`) for emails to Offices and Citizens.
- **AI**, each behind an adapter in `lib/` so tests can replace it:
  - Photos (`lib/ai.ts`): **Gemini** first, then **Groq** (Qwen vision) if Gemini fails or has no key, then an offline keyword guess, so a Report is never blocked by a provider being down. It returns the Category, severity, a summary, and whether the photo shows a civic problem at all.
  - Urdu voice (`lib/voice.ts`): **Gemini** turns a spoken Report into Urdu text plus an English translation. There is no fallback; without a Gemini key the mic says voice is off.
- **English and Urdu** (right to left): every on-screen text is in `lib/i18n/en.ts` and `lib/i18n/ur.ts`, switched with the language button.
- Tests: **Vitest** against **PGlite** (Postgres in Node), calling the real route handlers.

## How an Issue moves

1. A **Citizen** sends a **Report**: a photo, a location, and optionally text or speech in Urdu. AI checks that it is a civic problem and either merges it into a matching open **Issue** nearby or opens a new one.
2. An **Authority** reviews the priority queue (with reporters' contact details), flags spam, and assigns the Issue to a suggested **Office** of the right Department.
3. The **Office** staff start work, or send it back with a reason. When it is done they **Mark fixed** with a required after-repair photo; every reporting Citizen is emailed.
4. A reporting Citizen **confirms** (Resolution) or **rejects** it with a comment (it goes back to the Office). With no answer in 7 days it is **Closed unconfirmed**, which never counts as a Resolution.
5. The map, neighbourhood health scores, neglected areas and each Office's track record update from these statuses.

## Roles

Everyone signs in with Google, and the server works out the role on every request:

| Role | How you get it | Screens |
|---|---|---|
| Citizen | Any Google sign-in, then a profile (name and `+92 3xx xxxxxxx` phone) | Report, My reports |
| Authority | A Super Admin approves your Access request | Authority screen |
| Office staff | Listed as staff of one Office | My Office |
| Super Admin | Your email is in `SUPER_ADMIN_EMAILS` | Access requests |

Map, Issue pages and Insights are public. Reporter name, email and phone are shown only to Authorities and the assigned Office.

**Demo mode** (`DEMO_MODE=true`): a banner and role switcher sign you in as one of four Demo accounts, with made-up seeded data. Demo and real data never mix, and Demo Issues never send real email.

### Demo story (about 3 minutes)

The seed leaves each Demo account something to do:

1. **Map** (no sign-in): heatmap and health layers; I-10, G-11 and I-9 show as neglected; G-9 has a pothole that came back after a repair.
2. **Demo Citizen**, then **Report a problem**: add any street photo and a demo location (try F-10 Markaz twice to see duplicates merge), or tap **Speak in Urdu**. **My reports** has one Fix waiting for an answer: confirm it, and the Resolution shows in Insights.
3. **Demo Authority**: pick an Open Issue in the queue, see who reported it, and assign it to the suggested Office.
4. **Demo Office staff**: **My Office** has one job of each kind: start the Assigned one, and mark the In progress one fixed with an after-photo.
5. **Insights**: health by sector, neglected areas, predictive maintenance, and the Office track record (Fixes, Rejections, Unconfirmed closures, days to fix).
6. Switch to **اردو** at any point; the whole site turns right to left.

## Run it locally

Needs Node 22+ and the accounts in [`docs/SETUP.md`](docs/SETUP.md).

```bash
npm install
cp .env.example .env.local   # fill in the values; never commit it
npm run seed                 # loads the ~70 demo Issues, Offices and Demo accounts
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | Vitest + PGlite API tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

Database changes are numbered files in `db/migrations/`; add a new one and apply it to Supabase.

## Build status

See [`docs/PLAN.md`](docs/PLAN.md): steps are ticked once they are deployed. Built: storage on Supabase and Cloudinary; sign-in with roles, Authority access and Demo mode; reporting with spam rules; Authority assigning; Office work, Citizen confirmation, Unconfirmed closure and email; Insights with the Office track record; Urdu with right-to-left layout and voice Reports. Later ideas are in PRD section 10.

Videos are not supported; Reports take photos only.
