@AGENTS.md

# Invisible City

Civic-problem reporting for Islamabad. Hackathon deadline: 28 November 2026.

## Read before changing behaviour

- `GLOSSARY.md`: the domain language. Name code, UI text and docs with its terms (Citizen, Authority, Office, Issue, Report, Fix, Resolution…), and add a term there when a new concept appears.
- `docs/PRD.md`: what the product does and the rules agreed with the team. A change to a rule updates the PRD in the same change.
- `docs/PLAN.md`: the ordered build list. Mark steps done as they land.
- `docs/adr/`: why the stack and sign-in look the way they do. Reversing one of these decisions means a new ADR that supersedes it.

## Conventions

- Every piece of on-screen text goes through the translation file, so Urdu (right-to-left) can be added without touching screens.
- Each build step leaves the app working and deployed: deploy to Vercel after each step, never batch.
- Reporter email and phone are shown only to Authorities and the assigned Office. Display names are public.

## Agent skills

### Issue tracker

Local markdown under `.scratch/<feature>/`, committed with the branch. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

## Machine gotchas (Windows)

- Node is not on PATH. Prefix the shell: PowerShell `$env:Path = "E:\Node;" + $env:Path`, Git Bash `export PATH="/e/Node:$PATH"`.
- `dev.log` and `HANDOFF.md` are local notes; keep them out of commits.
