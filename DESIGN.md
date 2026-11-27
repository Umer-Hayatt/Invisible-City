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

## Motion
Motion for React (`motion/react`, loaded lazily) is the one animation library; Lenis smooths scrolling on public pages only; no GSAP (nothing needs it).
- Tokens in `lib/motion.ts`: one ease-out curve, durations (fast 0.18s, base 0.32s, slow 0.6s, hero 0.9s), stagger gaps, springs, rise distances, the viewport rule (reveal once at 15% visible).
- Components in `components/animate/`: FadeIn, SlideUp, RevealText (word by word behind a mask; screen readers get the sentence), StaggerContainer/StaggerItem, AnimatedCard, ImageReveal (clip and settle), PageTransition (every route, in `app/template.tsx`), ScrollProgress (home page), MotionRegister.
- Two registers: **story** (home page, Issue pages: longer reveals while scrolling) and **work** (the workspace, the report form, My reports: short, near, never in the way). `components/PageShell.tsx` picks the register.
- Workspace motion: the sidebar's active highlight slides between items, figures count up and arrive in turn, category bars grow, request/contract/job cards arrive in turn and glide when filtered, new chat messages slide in (history does not), dialogs, dropdowns and sheets fade and zoom (shadcn), the tab highlight slides.
- Rules: transform and opacity only (clip-path for image reveals); no layout shift; map markers are never animated one by one; reduced motion turns movement off (MotionConfig `reducedMotion="user"`, RevealText shows plain text, Lenis and parallax off).

## Backgrounds and photography
- One background system (`components/backgrounds`, plus Magic UI's MIT grid and dot patterns in `components/primitives`):
  **Aurora** for the home hero only; **GridPattern** for How it works, the live map and (very faint) every page header;
  **DotPattern** for the features bento; **MeshGradient** for the statistics; **Beams** for the closing call.
  Aurora, MeshGradient and Beams are our own code (the shadcn.io and Aceternity versions are not under a licence we
  can commit to a public repo). All animate transform only, sit behind content, ignore the pointer, and stop for
  reduced motion.
- Photographs are real Islamabad (or Pakistan, labelled so) from Unsplash and Pexels, listed with photographer, source
  and licence in `public/photos/CREDITS.md` and credited in the footer. Served through Next.js `Image` (responsive,
  WebP/AVIF, fixed frames). Evidence photos on Issue pages are never animated in a way that hides them.
- Text effects: `BlurText` (blur to sharp, word by word) for major headings; `RevealText` (words rise behind a mask)
  elsewhere. `ScrollReveal` enters from a direction, `ParallaxImage` drifts with the scroll, `BentoCard` lifts,
  lights its border and zooms its photo on hover.
- Scrollbar: thin canvas track, rounded navy-to-blue thumb, teal-blue on hover (Firefox gets the standard colours);
  the native scrollbar is kept. A blue scroll progress bar runs along the top of the home page.

## Don'ts
- No gradients beyond the hero photograph's scrim, no glassmorphism, no decorative shapes.
- No new colours outside the tokens; no colour that carries meaning without a word next to it.
- No more than one primary (blue) button in a view; other actions are white bordered buttons.
- No bold display type in working pages; no rounded corners above 12px.
