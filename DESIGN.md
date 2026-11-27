---
name: Civora
description: A calm, premium civic SaaS. Deep navy brand, royal-blue actions, a touch of teal, on off-white with white cards.
colors:
  navy: "#172B4D"
  navy-2: "#21396A"
  action: "#2563EB"
  action-600: "#1D4ED8"
  brand: "#1D4ED8"
  brand-50: "#EFF6FF"
  teal: "#14B8A6"
  teal-700: "#0F766E"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  sunken: "#F1F5F9"
  ink: "#0F172A"
  ink-2: "#334155"
  muted: "#64748B"
  line: "#E2E8F0"
  line-strong: "#CBD5E1"
  st-open: "#B45309"
  st-assigned: "#475569"
  st-work: "#1D4ED8"
  st-fixed: "#0F766E"
  st-done: "#15803D"
  st-closed: "#64748B"
  danger: "#DC2626"
typography:
  family: "Geist"
  mono: "Geist Mono"
  urdu: "Noto Naskh Arabic"
rounded:
  tag: "6px"
  control: "6px"
  card: "8px"
---

# Design System: Civora

Inspired by Linear, Stripe, Vercel and Mercury: quiet surfaces, one clear action per screen, dense but calm data.
Every colour is a token in `app/globals.css`; components never hardcode a colour.

## Colour
- **Navy** (`navy`) is the brand: the logo tile, the Demo banner, the footer, the hero over its photograph.
- **Royal blue** (`action`) is for the primary button of a screen, the active navigation item (`brand-50` fill, `brand` text) and links. One primary button per view.
- **Teal** (`teal`) is a small highlight only: the tick in the logo, the Private tag, the Fixed status.
- Ground: `canvas` page, `surface` (white) cards with a `line` border and a hairline shadow, `sunken` for table heads, hovers and quiet fills.
- Text: `ink` for content, `ink-2` for secondary content, `muted` for labels and metadata.
- Red, amber and green appear only for statuses, alerts and feedback. Statuses are soft badges: a tinted fill, a dot and the status ink (`StatusBadge`). Map dots use the brighter `pin-*` tokens.
- Dark mode (`.dark`) swaps the ground tokens for the same navy family; brand, statuses and shadows adjust.

## Type
- Geist for everything Latin, Noto Naskh Arabic for Urdu (right to left).
- Weights: 600 for headings and table names, 500 for labels, buttons and navigation, 400 for prose. No 700 except the home hero.
- Page title 28px, section title 18–20px, body 15px, metadata 13px, table head 12px.

## Layout
- **Citizens and visitors**: a white top bar (logo, City map, My reports, theme, language, avatar menu, Report a problem). On phones the links move into a right-hand sheet.
- **Authority, Business, Super Admin**: a white sidebar (logo, the role, its sections with icons, theme and language, the avatar menu) and a content column up to 72rem. On phones the sidebar becomes a slim header with scrolling tabs.
- The Demo banner sits above everything at a fixed height (`--banner`); the bars and the sidebar sit below it.
- Every page starts with `PageHeader`: title, one sentence, and its actions on the right, over a hairline.

## Components
- `components/ui.tsx`: Card, PageHeader, SectionTitle, Stat, StatusBadge, CriticalTag, Tag, Empty, skeletons, `btn` and `field` looks.
- `components/primitives/`: shadcn/ui (button, input, select, dialog, sheet, dropdown menu, tabs, table, badge, avatar, tooltip, pagination, popover, command, checkbox, scroll area), mapped onto the tokens. Overlays sit at z-index 1100, above the map and the bars.
- `components/DataTools.tsx`: SearchInput, `matches()`, `usePaged` + Pager, ConfirmDialog, Alert. Every list page uses the same toolbar: status tabs (`Segmented`), filters, search, then a table with pagination.
- Actions that are hard to undo (revoke, approve, decline, spam flag) always ask in a ConfirmDialog; never `window.confirm` or `window.alert`.
- `components/UserMenu.tsx`: the avatar menu (name, email, role, Profile, Sign out).

## Motion (later phase)
Animations come in a later phase. Sections are separate components so reveals, counters, hover and page transitions can be added without moving layout. The existing light touches stay (count-up figures, the sliding tab highlight, view transitions); no new animation libraries.

## Don'ts
- No gradients beyond the hero photograph's scrim, no glassmorphism, no decorative shapes.
- No new colours outside the tokens; no colour that carries meaning without a word next to it.
- No more than one primary (blue) button in a view; other actions are white bordered buttons.
- No bold display type in working pages; no rounded corners above 12px.
