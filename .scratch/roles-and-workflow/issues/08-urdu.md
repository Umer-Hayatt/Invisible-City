# 08: Urdu text and Urdu voice Reports

**What to build:** The app can be switched to Urdu with a right-to-left layout, and a Citizen can speak a Report in Urdu. This is the first ticket to cut if time runs short.

**Blocked by:** 06 (voice also needs 04)

**Status:** ready-for-agent

- [ ] Urdu translation file covers every on-screen string; a language switch applies without touching screens
- [ ] Right-to-left layout works on Citizen and staff screens, including the map controls
- [ ] Mic button on the Report form: Gemini returns Urdu text plus an English translation; the Citizen sees the text before submitting
- [ ] Authorities see both the Urdu text and the English translation on the Report
- [ ] `docs/PLAN.md` step 10 is ticked and deployed

## Comments

**23 November 2026, branch `ticket-08-urdu`** (built on `ticket-07-insights-office-record`, so #1 and #2 merge first): built and covered by `tests/i18n.test.ts` and `tests/voice.api.test.ts`.

- Language switch: a `lang` cookie (button in the Nav, desktop and mobile). The root layout reads it, sets `<html lang dir>`, and `<LocaleSync>` sets the language `t()` uses before anything else renders, so screens never pass a language. Switching reloads the page.
- `lib/i18n/ur.ts` is typed `Record<MessageKey, string>`, so a missing key fails `tsc`; tests also check every `{placeholder}` survives and that every text is in Urdu script. Remaining hard-coded English (home, Insights, Report form, Issue page, Authority queue, map popups and legend, badges, "time ago", dates) moved into `en.ts`. Predictive-maintenance and neglect sentences are now built on screen from numbers the API returns, so they translate too.
- Right to left: physical classes (`ml-`, `pr-`, `left-`, `text-right`…) became logical ones (`ms-`, `pe-`, `start-`, `text-end`); forward arrows flip. The map itself stays left to right so Leaflet's zoom buttons and attribution stay put, and its popups switch back to the page direction. Urdu uses Noto Naskh Arabic (compact enough for the existing line heights); letter spacing and upper-casing are turned off for Urdu.
- Voice: `components/VoiceInput.tsx` (tap to start, tap to stop, 60 s cap) → `POST /api/voice` → `lib/voice.ts` (Gemini adapter, `setTranscriber` for tests) → `{ urdu, english }`. The Citizen sees the Urdu, can edit the English, and the Report stores the Urdu in the existing `reports.voice_transcript` column. Only Authorities and the assigned Office get `voice_transcript` back. No migration.
- Not translated on purpose: AI-written titles and summaries, Office and sector names, and emails (they stay English).

Not verified in a browser: I could not run the app here without the live Supabase and Gemini settings. Still for the owner: try the Urdu switch on phone and laptop (Citizen and staff screens, map), record a real Urdu Report with the live Gemini key, then tick `docs/PLAN.md` step 10.
