---
name: INvisible City
description: Islamabad's road signage as the public record of what got fixed.
colors:
  sign-green: "#00653a"
  sign-green-600: "#00562f"
  sign-green-700: "#004526"
  sign-green-100: "#bfdfcb"
  sign-green-50: "#e1efe6"
  sign-ink: "#ffffff"
  sign-soft: "#b9dcc6"
  sign-yellow: "#ffc400"
  sign-yellow-50: "#fff4c2"
  concrete: "#eef0ec"
  surface: "#ffffff"
  sunken: "#e3e6e1"
  ink: "#0f1a14"
  ink-2: "#34403a"
  muted: "#5f6b64"
  line: "#cfd4ce"
  asphalt: "#0d0f0e"
  asphalt-surface: "#151917"
  asphalt-sunken: "#1c211e"
  night-ink: "#edf2ee"
  night-ink-2: "#b9c3bc"
  night-muted: "#84908a"
  night-line: "#29302c"
  night-brand: "#3fb57a"
  night-brand-600: "#2f9e66"
  night-sign: "#006b3e"
  night-yellow: "#ffcf26"
  vms-board: "#090a09"
  vms-amber: "#ffb21a"
typography:
  display:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "clamp(3rem, 5.6vw, 5rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  route:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Overpass, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.25
  figure:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "0em"
    fontFeature: "\"tnum\" 1"
  urdu:
    fontFamily: "Noto Naskh Arabic, Overpass, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.75
rounded:
  plate: "7px"
  field: "8px"
  row: "10px"
  vms: "12px"
  card: "14px"
  sign: "18px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  stack: "28px"
  section: "64px"
  section-sm: "80px"
components:
  button-primary:
    backgroundColor: "{colors.sign-green}"
    textColor: "{colors.sign-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.row}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.sign-green-600}"
  button-on-sign:
    backgroundColor: "{colors.sign-ink}"
    textColor: "{colors.sign-green}"
    rounded: "{rounded.row}"
    padding: "14px 24px"
  button-on-sign-hover:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.ink}"
  button-accent:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
    padding: "8px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.sunken}"
  sign-panel:
    backgroundColor: "{colors.sign-green}"
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.sign}"
    padding: "40px 56px"
  sign-row:
    textColor: "{colors.sign-ink}"
    rounded: "{rounded.row}"
    padding: "10px 16px"
  sign-row-warn:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
  exit-tab:
    backgroundColor: "{colors.sign-yellow}"
    textColor: "{colors.ink}"
    padding: "4px 16px"
  message-sign:
    backgroundColor: "{colors.vms-board}"
    textColor: "{colors.vms-amber}"
    rounded: "{rounded.vms}"
    padding: "16px 28px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "6px 12px"
  badge-status:
    backgroundColor: "{colors.sign-green-50}"
    textColor: "{colors.sign-green-700}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: INvisible City

## Overview

**Creative North Star: "The Gantry Over the City"**

Islamabad's own road signage is the interface. Green sign panels with white reflective lettering own whole regions of the page; the route every Report travels is a painted lane line; the latest Issues scroll past on a variable message sign. The record of what got fixed reads the way a driver reads the road: big, bold, legible at a glance, and unambiguous about where to go next.

The ground changes with the hour. By day the page sits on pale concrete; by night (dark mode) on asphalt, and the signs stay green with white lettering in both. Sign yellow is a warning colour and nothing else: neglected sectors, the exit tab, the focus ring, selection. Depth comes from the sign panels themselves (inset white border plus one float shadow), not from layered glass or glow.

The home page is the full expression (Persuade). Working routes (map, insights, admin, office) take the same tokens, type and module with restraint: one sign panel at most, cards and the road-edge page header otherwise.

**Key Characteristics:**
- Sign green owns whole panels; white lettering and a white inset border on every sign.
- Sign yellow only for warnings, the exit tab, focus and selection.
- Overpass, a highway-gothic descendant, for every word; Overpass Mono for figures only.
- Heavy ink rules (3px nav underline, 5px route and road-edge lines) instead of hairlines.
- Motion paints lines and turns sign boards; it never decorates.

## Colors

Two inks plus white on a concrete or asphalt ground; every token swaps under `.dark`, so screens never branch by theme.

### Primary
- **Sign Green** (sign-green): the face of every sign panel, the primary button, the painted segment of the road-edge line, the active nav lane marker, the confirmed (last) stop on the route line. At night the interactive brand lifts to **Night Green** (night-brand) for legibility on asphalt while the sign face stays a deep green (night-sign).
- **Sign Green 600 / 700** (sign-green-600, sign-green-700): hover on green buttons; text on pale green tints (resolved badge, selection text).
- **Sign Soft** (sign-soft): the second line of a sign headline; the only tint allowed on a sign face besides white.

### Secondary
- **Sign Yellow** (sign-yellow; night-yellow at night): neglected-sector rows on the gantry, the exit tab, the accent button, focus outlines, text selection, the hover of the white on-sign button. Text on yellow is always ink (#0f1a14), in both themes.
- **Yellow Wash** (sign-yellow-50): the neglected-sectors notice beside the map, with a yellow border.

### Tertiary
- **Message Board** (vms-board) with **Message Amber** (vms-amber): reserved for the variable message sign. Fixed values; they do not swap with the theme.

### Neutral
- **Pale Concrete** (concrete) / **Asphalt** (asphalt): page ground and nav background.
- **Surface** (surface / asphalt-surface): cards, fields, map frame.
- **Sunken** (sunken / asphalt-sunken): skeletons, scrollbar track, icon wells, ghost-button hover, the map's own ground.
- **Ink** (ink / night-ink): headings, body, the nav's 3px bottom rule, the painted route line.
- **Ink 2** (ink-2 / night-ink-2): secondary text and inactive nav links.
- **Muted** (muted / night-muted): captions, metadata, stage descriptions.
- **Line** (line / night-line): 1.5px card borders and dividers; the unpainted road edge under the route line.

Data scales (severity blue/amber/orange/red, health green/ochre/orange/red) live in `components/ui.tsx` and the map; they encode data and are not brand colours.

### Named Rules
**The Green Owns Regions Rule.** Sign green appears as a whole panel or a solid fill. Pale green tints (sign-green-50/100) are kept for small status marks only: the resolved badge and the confirmed-Fix photo placeholder.

**The Yellow Means Warning Rule.** Sign yellow marks what needs attention (neglected sectors, focus, the exit). If nothing is wrong or focused, no yellow is on screen except the exit tab.

## Typography

**Display Font:** Overpass (with system-ui)
**Body Font:** Overpass (with system-ui)
**Label/Mono Font:** Overpass Mono (with ui-monospace), figures only
**Urdu:** Noto Naskh Arabic, falling back to Overpass for Latin

**Character:** One sign alphabet at every size, from black-weight gantry headings to semibold labels. The mono face is the odometer: counts, sector fixed-of-total, days and dates.

### Hierarchy
- **Display** (900, clamp(3rem, 5.6vw, 5rem), 0.92, -0.03em): the gantry headline only, two lines, the second in sign-soft.
- **Headline** (900, 2.25rem rising to 3.75rem at sm, 0.95, -0.02em, balanced): page titles in the page header; the closing sign headline (3rem at sm).
- **Title** (900, 1.875rem rising to 2.25rem, -0.02em): section headings on a page (map, proof). Smaller sub-headings use 1.125rem at 900.
- **Route** (800, 1.25rem rising to 1.5rem, tight): sector names on sign rows; 1rem at 800 for route-line stage names.
- **Body** (400, 1rem, 1.625, max 50-62ch): sentences under headings; 1.125rem on sign faces at 90% white.
- **Label** (600-700, 0.75-0.875rem): badges, captions, legends, nav links (15px at 700).
- **Figure** (Overpass Mono 500-600, tabular, 0 tracking): every number that is data.

### Named Rules
**The Figures Only Rule.** Overpass Mono sets digits, never words. Mixed sentences pass through the `Figures` helper so only the numbers change face. The single exception is the variable message sign, whose whole board is mono uppercase because that is what a real VMS shows.

**The Urdu Rule.** Under `lang="ur"`, letter-spacing is zeroed and upper-casing removed (they break joined Arabic letters), body line height opens to 1.75 and headings to 1.5.

## Layout

A single centred column, max 1280px (max-w-7xl), with a 16px gutter on phones and 24px from sm. Page top padding 32px, bottom 64px. Home sections stack 64px apart (80px from sm); the gantry, route line and message sign form one tight group 28px apart.

The gantry splits into a text column and a 340px route-row column at lg; below lg the rows stack under the text. The map section pairs a fluid map with a 360px aside at lg. The route line runs across in five equal columns from sm and down the start edge on phones. Working pages open with the page header (title, one sentence, road-edge line) before content.

## Elevation & Depth

Mostly flat with two lifts. Cards carry a soft ambient shadow at rest; sign panels and floating map popups carry one deeper float shadow. Sign borders are drawn with inset box-shadows, not borders, so the white stripe sits inside the green edge. The nav gains a shadow only once the page scrolls.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgb(15 26 20 / 0.06), 0 8px 24px -12px rgb(15 26 20 / 0.12)`; night `0 1px 2px rgb(0 0 0 / 0.5), 0 10px 28px -14px rgb(0 0 0 / 0.7)`): cards, map zoom control, the message sign.
- **Float** (`0 18px 50px -18px rgb(15 26 20 / 0.35)`; night `0 22px 60px -20px rgb(0 0 0 / 0.85)`): sign panels and map popups.
- **Sign border** (`inset 0 0 0 5px sign-green, inset 0 0 0 8px sign-ink`): the reflective border on every sign; 2px/3.5px on the logo plate.

### Named Rules
**The Painted Not Lit Rule.** Signs reflect; they do not glow. No coloured glows, blurred backdrops or gradient lighting on surfaces.

## Shapes

Gently rounded, sign-like rectangles, graded by size: logo plate 7px, fields and thumbnails 8px, sign rows and buttons 10px, message sign 12px, cards and photo frames 14px, sign panels 18px. Badges, the theme toggle and dots are full pills. The exit tab is rounded only on its two lower corners, as if hanging from the sign's top edge. Strokes are heavy: 1.5px card borders, 2.5px sign-row borders in currentColor, 3px nav rule, 5px route line and route-stop rings.

## Components

### Buttons
Solid, weighty and plain; every button takes a 0.97 press scale on active.
- **Shape:** gently rounded (10px).
- **Primary:** sign green, white text (dark text on night green), extra-bold 14px, 10px 20px; hover deepens to sign-green-600.
- **On-sign:** white button on a sign face, green text, black weight 16px, 14px 24px; hover turns sign yellow with ink text.
- **Accent:** sign yellow with ink text; hover brightness 95%.
- **Ghost:** surface with a 2px ink border at 80%, bold; hover sunken.
- **Dark:** ink fill with canvas text, for secondary emphasis on concrete.
- **Text link:** bold, 2px underline offset 6px; on signs the decoration turns yellow on hover.

### Chips (badges)
- **Style:** pill, 12px semibold, 2px 10px, a 1px inset ring of the same hue. Severity badges lead with a 6px dot in the severity colour.
- **State:** status badges map open/closed to sunken neutrals and resolved to green 50/700; category chips use tinted pastels that `.dark` rewrites to 13%-alpha fills with light text.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** surface.
- **Shadow Strategy:** card shadow.
- **Border:** 1.5px line; interactive cards turn the border sign green on hover, like a sign catching headlights.
- **Internal Padding:** 20px.

### Inputs / Fields
- **Style:** surface fill, 1px (1.5px on the map toolbar) line border, 8-12px radius, 10px 12px padding.
- **Focus:** border turns sign green with a faint green ring; the global focus-visible outline is 3px sign yellow offset 2px.

### Navigation
Sticky, concrete ground, a 3px ink rule along the bottom. Links are 15px bold in ink-2, ink when active; the active link carries a 5px sign-green lane marker sitting on the ink rule, which slides between links through a named view transition (380ms). Report is a primary button at the right. The logo is a small green sign plate reading "IN" in white with its own inset border, followed by "visible City" in extra-bold; it is always `dir="ltr"`. On phones the links collapse into a menu where the active row is an ink fill.

### Sign Panel (signature)
Sign green face, white lettering, inset white border, 18px corners, float shadow; 24px padding on phones up to 56px at lg. Hosts the gantry (headline, sentence, on-sign button, route rows) and the closing exit sign (exit tab plus a sign-row button).

### Route Row (signature)
A 2.5px currentColor border at 10px radius inside a sign: Lucide arrow (24px, stroke 3), sector name at route size, fixed-of-total in figures. Hover inverts to a white fill with green text. A neglected sector becomes a yellow row with ink text and a small "neglected" line.

### Route Line (signature)
A 5px road edge in line colour with a 5px ink line painted over it, five stops of 21px rings (5px ink border on canvas; the confirmed stop filled sign green). Each stop shows its live count in figure type beside the stage name.

### Page Header
Title at headline size, one sentence in ink-2 (max 62ch), then the road-edge line: a 5px ink bar with a 160px sign-green segment painted in from the start edge. No eyebrow above the title.

### Variable Message Sign
Near-black board, amber mono uppercase lettering at 0.04em tracking, 12px corners, a 2px inset frame and card shadow, an amber status dot. It cycles the latest eight Issues every 3.4s, each line rising in and out over 350ms; it is an `aria-live="polite"` region and links to the Issue.

### Motion
One timing set: ease-out `cubic-bezier(0.22, 1, 0.36, 1)`, ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)`, 160 / 320 / 700ms.
- **Route paint:** route and road-edge lines scale in from the start edge (700ms, staggered 160ms per item after 250ms; vertical 900ms on phones), like lane markings being painted, once on load.
- **Page transition:** only page content moves; the old page fades up 6px with a 2px blur in 160ms, the new rises 12px in 320ms after it. The nav is pinned out of the transition.
- **Theme switch:** the new theme spreads from the toggle as a growing circle (650ms).
- **Press:** 0.97 scale on active, 160ms.
- **Reduced motion:** every animation and transition collapses to 1ms with no delay or repeat; scroll reveals are removed; the theme switch is instant. Every state still arrives.

### RTL
Layout uses logical properties (start/end, ps/pe) throughout. Directional arrows flip with `rtl:-scale-x-100`; the route paint origin flips to the right edge. The logo and map attribution stay `dir="ltr"`.

## Do's and Don'ts

### Do:
- **Do** give sign green whole panels with white lettering and the inset white border (5px green, 3px white).
- **Do** keep sign yellow for warnings, the exit tab, focus (3px outline, 2px offset) and selection, always with ink text on it.
- **Do** set every data number in Overpass Mono with tabular figures, via `.figure` or the `Figures` helper.
- **Do** draw structure with heavy ink rules (3px nav, 5px route and road edge) and 1.5px line borders.
- **Do** open working pages with the page header and its painted road-edge line.
- **Do** use logical start/end spacing and flip directional arrows in RTL; keep the logo LTR.
- **Do** keep every motion meaningful (painting a line, turning a board, moving between pages) and collapse it under reduced motion.

### Don't:
- **Don't** put an eyebrow or kicker label above a heading; the heading carries the page.
- **Don't** use gradient text, glassmorphism (backdrop blur) or glowing borders and halos.
- **Don't** set words in Overpass Mono, outside the variable message sign.
- **Don't** use sign yellow as decoration or as a second brand colour.
- **Don't** wash large regions in pale green; a region is a sign panel or it is concrete.
- **Don't** introduce another typeface besides Overpass, Overpass Mono and Noto Naskh Arabic for Urdu.
