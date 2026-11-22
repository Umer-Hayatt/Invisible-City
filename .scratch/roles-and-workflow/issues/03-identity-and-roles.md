# 03: Sign-in, roles, Authority access and demo mode

**What to build:** Everyone signs in with Google; each role sees only its own screens. Authorities come only through an Access request approved by a Super Admin. Judges can switch between Demo accounts on the live site while real sign-ins keep working and data stays separate.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Supabase "Sign in with Google" behind a Session adapter (real and fake); sign-out works; the session survives a revisit
- [ ] First-sign-in profile form (display name, `+92 3xx xxxxxxx` phone); an incomplete profile is sent to the form when trying to report
- [ ] Role resolved on every request, never from the client: Super Admin from `SUPER_ADMIN_EMAILS`, approved Authority, Office staff for one Office, otherwise Citizen
- [ ] Every API route returns "unauthenticated" or "forbidden"; tests cover each role against another role's commands; the `admin123` passcode and cookie are removed
- [ ] Request Authority access form (name, Department, official email, phone); Super Admin page to approve or decline; an approved person signs in as Authority
- [ ] Demo mode server setting: role switcher over the four Demo accounts, visible Demo banner, demo and real data excluded from each other
- [ ] All new on-screen text goes through the translation file
- [ ] `docs/PLAN.md` step 3 is ticked and deployed
