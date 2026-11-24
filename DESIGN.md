---
name: INvisible City
description: Hi-vis lime on charcoal and navy; a repair crew's vest as the interface.
colors:
  lime: "#cdf22b"
  lime-600: "#bae012"
  on-lime: "#171a0c"
  char: "#1b1b1c"
  char-2: "#2a2b2d"
  char-line: "#3d3f43"
  navy: "#242b3a"
  navy-2: "#2d3547"
  navy-line: "#434d63"
  on-dark: "#f6f7f9"
  on-dark-2: "#bcc3cf"
  canvas: "#f3f4f7"
  surface: "#fdfdfe"
  sunken: "#e7e9ee"
  ink: "#171a20"
  ink-2: "#3a404b"
  muted: "#5c6370"
  line: "#d3d7df"
  brand: "#47600a"
  st-open: "#2763c4"
  st-assigned: "#52617d"
  st-work: "#b9540a"
  st-done: "#1d7443"
  st-closed: "#5d6471"
  danger: "#cc2a21"
typography:
  family: "Google Sans"
  urdu: "Noto Naskh Arabic"
rounded:
  tag: "4px"
  control: "6px"
  panel: "8px"
---

# Design System: INvisible City

The team's reference picture (`fixes.docx`, 24 November 2026) sets this look. It replaces the road-signage design. All tokens live at the top of `app/globals.css`; screens use them by name and never branch by theme.

## Colour

- **Lime** is a fill with `on-lime` lettering: the primary button, the figures band, the current choice, step numbers, the Fixed badge. It is never text on a light ground.
- **Brand** is the lime family where it must be read: dark olive by day, lime by night. Links and small icons.
- **Charcoal** holds the nav, the footer and the dark cell of the figures. **Navy** holds the map section and every working page's header. Both are the same day and night.
- **Status** colours are solid tags with white lettering (Fixed is lime). Map pins use the brighter `pin-*` tokens.
- **Danger** red means Critical, a Rejection or an error, and nothing else.

## Type

Google Sans throughout, 400 prose, 500 to 600 labels and actions, 700 heads. Sentence case, never tracked capitals. Body 16px. Numbers that are data use tabular figures. Urdu uses Noto Naskh Arabic with looser lines.

## Layout

Home is full-width bands: photo hero, How it works, the navy map with its list, the figures strip over lime, a closing photo. Content is capped at 1280px. Every other page sits in that column and opens with `PageHeader`, a navy band to both screen edges.

## Components

- **Buttons** (`btn` in `components/ui.tsx`): primary lime, ghost, dark, char (on lime), onDark (on navy, charcoal and photographs). 6px corners, 44px or taller.
- **Cards**: 8px corners, 1px line, no nested cards.
- **StatusBadge** and **CriticalTag**: 4px solid tags. Severity is never shown except Critical, and only while the Issue is still waiting.
- **Issue list item**: headline, status, one sentence (who reported, where, when). No thumbnails, meters or scores.
- **Map**: teardrop pins by stage, red for Critical. The home and Insights maps are always the night map.
- **Offices**: one row and one email per Office.

## Don'ts

- No underlined nav or headings, no painted lines under titles, no progress bars for health or priority.
- No middle-dot strings, decorative status dots, eyebrows, gradients on surfaces, glows or glass.
- No health score, priority number or neglected sector on a Citizen's screen.
