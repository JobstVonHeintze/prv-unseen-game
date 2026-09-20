---
version: alpha
name: Provisional nocturnal
description: "Design tokens and rationale for contrejour. Hex values are PROVISIONAL, lifted from docs/assets/unseen_location_map.svg. Visual tokens remain [NEEDS CLARIFICATION]."
colors:
  primary: "#0e1524"
  secondary: "#9fb0cf"
  tertiary: "#c9a24a"
  neutral: "#f1f4fa"
  on-primary: "#f1f4fa"
  on-secondary: "#0e1524"
  on-tertiary: "#0e1524"
  on-neutral: "#0e1524"
  ink: "#d7e0f2"
  muted: "#7f90b3"
  panel: "#172033"
  panel-edge: "#3a4a72"
  street: "#1a2440"
  danger: "#ef6351"
  warn: "#f2a33a"
  phase-0: "#9aa5b8"
  phase-1: "#9aa5b8"
  phase-2: "#f2a33a"
  phase-3: "#ef6351"
  phase-4: "#b48cf0"
  phase-5: "#3fb8a9"
  gold-line: "#c9a24a"
typography:
  h1:
    fontFamily: "IBM Plex Sans"
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "IBM Plex Sans"
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.25
  h3:
    fontFamily: "IBM Plex Sans"
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: "IBM Plex Sans"
    fontSize: 1rem
    lineHeight: 1.55
  body-sm:
    fontFamily: "IBM Plex Sans"
    fontSize: 0.875rem
    lineHeight: 1.45
  label-caps:
    fontFamily: "IBM Plex Sans"
    fontSize: 0.7rem
    fontWeight: 600
    letterSpacing: "0.12em"
  phone-body:
    fontFamily: "IBM Plex Sans"
    fontSize: 0.95rem
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  phone: 28px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 8px
  input:
    backgroundColor: "{colors.street}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 12px
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 24px
  phone-frame:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.phone}"
    padding: 16px
  status-pill:
    backgroundColor: "{colors.street}"
    textColor: "{colors.muted}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  finding-open:
    backgroundColor: "{colors.warn}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.pill}"
    padding: 6px
---

## Overview

contrejour has two surfaces and one palette. Tokens above are **provisional**,
lifted from `docs/assets/unseen_location_map.svg` (`#0e1524` ground, `#c9a24a`
Rue Valmont dash, phase chips). Nothing depends on colour alone: every phase
chip also shows `L1 · P0` style numbers.

**[NEEDS CLARIFICATION]** Final visual tokens. Do not invent a second palette.

## Posture

### [Player]

Intimate, quiet, nocturnal, text-first. It should feel like holding someone
else's phone. Deferential: the interface never comments on the story and never
shows a number that Elena could not see. No meters, no ending forecast, no
witness queue.

### [Console]

Calm, dense, exact. A desk, not a dashboard. Diffs, validation, findings and
storyboard prompts are first-class. Nothing moves unless the author moved it.

## Colors

- **Primary (#0e1524):** night ground. Player chrome and Console page.
- **Secondary (#9fb0cf):** captions, metadata, low-emphasis text.
- **Tertiary (#c9a24a):** the single accent. Primary action only.
- **Neutral (#f1f4fa):** rare light ink on dark, and print fallback.
- **Phase chips (provisional):** P0/P1 `#9aa5b8`, P2 `#f2a33a`, P3 `#ef6351`,
  P4 `#b48cf0`, P5 `#3fb8a9`. Always paired with the phase number.

## Typography

IBM Plex Sans for both surfaces. Quiet, slightly technical, not costume
drama. Player body uses `phone-body`. Console headings stay small; density
beats display type.

## Layout

- **Player:** a phone frame, max 390px content width, readable at real phone
  width. The surrounding page is dark and empty.
- **Console:** full desk. Left rail (entity types), centre (editor or
  inspector), right (findings / validation). Max content 1440px.
- Gutters: 16px phone, 24px desk.
- Breakpoints: 390px (Player), 1024px (Console rail collapse).

## Elevation & Depth

Reduced motion by default. No decorative shadow language. Separation is a
1px `panel-edge` line, not a drop shadow.

## Shapes

- Player chrome: `rounded.phone`.
- Desk cards: `rounded.md`.
- Status and phase chips: `rounded.pill`.
- Tables: hard edges.

## Components

### [Player]

Phone frame. App grid (Recorder, Camera, Vault, Messages, Account, Maps,
Notes, Calendar). Evening header with date. Location picker. Scene reader.
Choice list. Capture sheet (mode, placement, start and stop). Clip marker
over a text transcript. Recipient picker with warning-or-demand tone for
incriminated recipients. Timeline with rewind. Open-question line in Notes.
Flag sheet (tester): rewrite, location missing/broken, needs detailing.

### [Console]

Entity list with search and tier filter. Run inspector: event log beside
full state, meters, witness queues. Findings queue. Storyboard board:
image, prompt, prompt history, edit. Location schematic from the space
graph. Knowledge / timing overlay (what the player can know on a given
evening).

### [Console+Player]

Location schematic rendered from the space graph.

## Accessibility

Keyboard-complete. Readable at phone width. No information by colour alone.
Reduced motion by default. Focus rings use `tertiary` on `primary`.

## Do's and Don'ts

**Do:**
- Reference tokens in every CSS value.
- Show phase as number + colour.
- Keep Player ignorant of hidden state.

**Don't:**
- Use framework defaults (`blue-500`, `indigo`).
- Hardcode hex values in components.
- Explain the theme to the player.
- Put art, video or 3D in the Player.
