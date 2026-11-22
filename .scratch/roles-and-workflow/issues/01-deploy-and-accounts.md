# 01: Deploy the current app and set up accounts

**What to build:** The team's outside accounts exist, their keys are in `.env.local` and Vercel, and the current app builds and loads on the live Vercel site from the GitHub repo. Steps are in `docs/SETUP.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Google OAuth client, Cloudinary account, project Gmail app password and Gemini key exist; their values are in `.env.local` and Vercel (done by the team, never pasted in chat)
- [ ] Supabase and Vercel projects exist; Vercel is connected to the GitHub repo; `SUPER_ADMIN_EMAILS` and the other variables are set
- [ ] `.env.example` lists every variable and is committed; `dev.log` stays ignored
- [ ] The current app deploys to Vercel and the home page loads (smallest fix if SQLite blocks it)
- [ ] `docs/PLAN.md` step 1 is ticked
