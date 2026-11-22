# 03: Sign-in, roles, Authority access and demo mode

**What to build:** Everyone signs in with Google; each role sees only its own screens. Authorities come only through an Access request approved by a Super Admin. Judges can switch between Demo accounts on the live site while real sign-ins keep working and data stays separate.

**Blocked by:** 02

**Status:** resolved

- [x] Supabase "Sign in with Google" behind a Session adapter (real and fake); sign-out works; the session survives a revisit
- [x] First-sign-in profile form (display name, `+92 3xx xxxxxxx` phone); an incomplete profile is sent to the form when trying to report
- [x] Role resolved on every request, never from the client: Super Admin from `SUPER_ADMIN_EMAILS`, approved Authority, Office staff for one Office, otherwise Citizen
- [x] Every API route returns "unauthenticated" or "forbidden"; tests cover each role against another role's commands; the `admin123` passcode and cookie are removed
- [x] Request Authority access form (name, Department, official email, phone); Super Admin page to approve or decline; an approved person signs in as Authority
- [x] Demo mode server setting: role switcher over the four Demo accounts, visible Demo banner, demo and real data excluded from each other
- [x] All new on-screen text goes through the translation file
- [x] `docs/PLAN.md` step 3 is ticked and deployed
