# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary audience for the public site: hackathon judges** deciding within a few minutes, on 28 November 2026, whether this is a real civic product. They must see the whole loop: a Report, AI sorting, an Office's Fix, and the Citizen's confirmation.
- **Citizens** of Islamabad, mostly on phones, reporting a public problem (pothole, broken light, overflowing bin, blocked drain) in about 30 seconds and following it to the Fix.
- **Authorities** (city officials, on laptops) reviewing a priority queue and assigning Issues to Offices.
- **Office staff** (on laptops and phones) starting work, sending back, and recording Fixes with an after-photo.
- **Super Admins** approving Authority access requests.

## Product Purpose

Turns individual Reports into one record per real-world problem (an Issue), routes each Issue to the Office that can fix it, and closes the loop with the Citizen who reported it. Success: problems actually get fixed, and the city can see where they are not.

## Positioning

A closed loop with proof. An Issue is not done when an official says so: the Office must upload an after-repair photo, and only a Citizen who reported it can confirm the Fix (or reject it, sending it back). Unanswered Fixes close as "Closed unconfirmed" and never count as Resolutions. Each Office's track record (Fixes, Rejections, Unconfirmed closures, days to fix) is public.

## Operating Context

- Public pages (map, Issue pages, Insights) need no sign-in; reporting does (Google sign-in plus a display name and +92 phone).
- Demo mode: anyone can switch between four made-up Demo accounts (Citizen, Authority, Office staff, Super Admin) on the live site, under a visible Demo banner; Demo and real data never mix.
- Islamabad sectors (F-7, G-9, I-10…) are the geography; the seed tells a story: I-10, G-11 and I-9 are neglected, G-9 has a repair that failed and came back.

## Capabilities and Constraints

- Next.js 16 App Router, React 19.3, Tailwind 4, Supabase Postgres, Cloudinary photos, Gmail email, deployed on Vercel.
- AI: Gemini, then Groq, then an offline keyword guess for photo analysis; Gemini for Urdu voice Reports.
- Every on-screen string goes through `lib/i18n` (`t()`); English and Urdu (right to left) must both work.
- Light and dark mode exist and must keep working.
- Reporter name, email and phone are shown only to Authorities and the assigned Office; public pages stay anonymous.
- Domain terms come from `GLOSSARY.md` (Citizen, Authority, Office, Issue, Report, Fix, Resolution, Rejection, Unconfirmed closure).

## Brand Commitments

- Name: **INvisible City** (styled with "IN" emphasised). No other visual element is fixed; logo mark, palette, type and tagline are open to replacement.

## Evidence on Hand

- Seeded demo data: about 70 Issues across Islamabad sectors, 16 Offices, four Demo accounts.
- Photos: per-category placeholder photos uploaded by the seed; real Report photos from real use.
- No testimonials, partner logos, press, user counts or official endorsements exist. Do not invent them.

## Product Principles

1. Proof over promises: show the after-photo and the Citizen's answer, not claims.
2. Public accountability without exposing people: name Offices and sectors, never reporters.
3. Thirty seconds to report, on a phone, in English or Urdu.
4. The demo must tell the whole loop in a few minutes.

## Accessibility & Inclusion

- Urdu right-to-left layout and Urdu voice input.
- Reduced-motion users get every state without movement.
