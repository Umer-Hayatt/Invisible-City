# Setup: accounts and environment variables

PLAN step 1. Four accounts only a team member can create (Google OAuth client, Cloudinary, project Gmail, Gemini), plus the Supabase and Vercel projects. Never paste a key into chat or commit it. Keys go in `.env.local` (your machine) and in Vercel environment variables (the deployed site). `.env.example` lists every variable.

**Suggested order:** Supabase and Vercel projects first (Claude creates them with your approval), because the Google OAuth client needs the Supabase project's URL and the Vercel site address. Cloudinary, Gmail and Gemini do not depend on anything and can be done any time.

## 1. Google OAuth client (for "Sign in with Google")

Needs the Supabase project URL (`https://<project-ref>.supabase.co`) and the Vercel site URL.

1. Open <https://console.cloud.google.com> and sign in with the project Gmail (or a team member's).
2. Create a project (top bar → New project), e.g. `invisible-city`.
3. **APIs & Services → OAuth consent screen** (may be called Google Auth Platform → Branding):
   - User type **External**; app name `Invisible City`; support and developer email = project Gmail.
   - Scopes: only the defaults (`email`, `profile`, `openid`).
   - Publishing status: **In production** (use "Publish app"). With "Testing", only listed test users can sign in, and judges cannot. Basic scopes need no Google verification.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorized JavaScript origins:** `http://localhost:3000` and your Vercel site URL (`https://<project>.vercel.app`).
   - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback` (this one is required; Supabase receives the Google response, not our app).
5. Copy the **Client ID** and **Client secret**.
6. Supabase dashboard → **Authentication → Providers → Google**: switch it on and paste the Client ID and secret there. These two values live only in Supabase, not in `.env`.
7. Supabase dashboard → **Authentication → URL Configuration**: set **Site URL** to the Vercel site URL and add `http://localhost:3000/**` and `https://<project>.vercel.app/**` to **Redirect URLs**.

## 2. Cloudinary (photo storage)

1. Sign up (free plan) at <https://cloudinary.com>.
2. **Dashboard** (or Settings → API Keys) shows **Cloud name**, **API key**, **API secret**.
3. Put them in `.env.local` and Vercel as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. The secret must never reach the browser (no `NEXT_PUBLIC_` prefix).

## 3. Project Gmail with an app password (outgoing email)

1. Create a Gmail account for the project, e.g. `invisiblecity.islamabad@gmail.com`.
2. Turn on **2-Step Verification**: <https://myaccount.google.com/security>. App passwords do not appear without it.
3. Open <https://myaccount.google.com/apppasswords>, name it `Invisible City`, create it, and copy the 16-character password (shown once; spaces do not matter).
4. Set `GMAIL_USER` (the address) and `GMAIL_APP_PASSWORD` (the 16 characters) in `.env.local` and Vercel. Gmail allows about 500 emails per day, plenty for the demo.

## 4. Gemini API key (photo analysis, later voice)

1. Open <https://aistudio.google.com/apikey> signed in with a Google account.
2. **Create API key** (free tier is enough). Copy it.
3. Set `GEMINI_API_KEY` in `.env.local` and Vercel.
4. Optional fallback: a Groq key from <https://console.groq.com/keys> as `GROQ_API_KEY`. The app still works without it (falls back to the offline keyword guess).

## 5. Supabase and Vercel (Claude creates these, with your approval at each step)

After Claude creates the Supabase project you collect three things from the dashboard (**Project Settings → Data API / API Keys / Database**, or the **Connect** button):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key. Safe for the browser. |
| `DATABASE_URL` | Connect → **Transaction pooler** connection string (port 6543). The database password is the one you chose when the project was created; replace `[YOUR-PASSWORD]` yourself. |

Use the pooler string from Vercel's serverless functions (spec: avoids running out of connections). `DIRECT_DATABASE_URL` is the direct or session-mode string, used only by the migration and seed scripts.

## 6. Where each value goes

- **Local:** copy `.env.example` to `.env.local` and fill it in. `.env*` is already git-ignored. Restart `npm run dev` after changing it.
- **Vercel:** Project → **Settings → Environment Variables**. Add every variable for Production and Preview (and Development if you use `vercel env pull`). Claude can add the non-secret ones through the Vercel connector; type the secrets yourself in the dashboard. A redeploy is needed before changes take effect.

## 7. Team settings

- `SUPER_ADMIN_EMAILS`: comma-separated Gmail addresses of the Super Admins, e.g. `umerhayat2444@gmail.com`. Anyone listed here signs in as Super Admin.
- `DEMO_MODE`: `true` on the public site so judges can use the Demo accounts.
- `NEXT_PUBLIC_SITE_URL`: the deployed address, or `http://localhost:3000` locally.
