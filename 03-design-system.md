# 03 — Design System

**Direction:** museum exhibition catalogue meets modern architectural journal. Quiet, confident, editorial. Information first, ornament never.

## 1. Banned list (reject in review)

- Dark mode as default (a dark theme is out of scope for v1).
- Purple, pink, or rainbow gradients; any gradient used as decoration.
- Glassmorphism, backdrop blur panels, glow, neon, floating orbs, particle fields.
- Bento grids of unequal tiles competing for attention.
- Stock AI imagery: robots, brains, circuit faces, glowing networks.
- Marketing filler: "revolutionary", "seamless", "unlock", "supercharge", "next-gen", "AI-powered" as a headline.
- Emoji as icons. Drop shadows heavier than the hairline elevation defined below.
- Auto-playing animation that does not carry meaning.

## 2. Color tokens

Single accent: **deep slate blue**. Terracotta is not used as a second accent; it appears only inside the data-encoding palette below.

```css
:root {
  /* canvas */
  --bg-canvas:   #FAFAFA;
  --bg-surface:  #FFFFFF;
  --bg-sunken:   #F3F4F6;

  /* text */
  --text-strong: #111827;
  --text-body:   #4B5563;
  --text-muted:  #6B7280;   /* min 4.5:1 on #FFFFFF; do not go lighter */

  /* lines */
  --line:        #E5E7EB;
  --line-strong: #D1D5DB;

  /* accent (single) */
  --accent:      #1F3A5F;
  --accent-hover:#16304F;
  --accent-tint: #EAEFF5;

  /* focus */
  --focus-ring:  #1F3A5F;   /* 2px outline, 2px offset */
}
```

### Data-encoding palette (charts, overlays, badges only)

Muted, perceptually ordered, colour-blind safe, always paired with a label or pattern. Never used for decoration.

```css
:root {
  --enc-ok:      #4F7A64;   /* low / favourable */
  --enc-caution: #B08A3E;   /* moderate */
  --enc-elevated:#A4543A;   /* elevated (terracotta family) */
  --enc-neutral: #9CA3AF;
}
```

## 3. Typography

Self-hosted WOFF2, `font-display: swap`, subset to Latin.

| Role | Family | Notes |
|------|--------|-------|
| Display / headings | Newsreader (or Source Serif 4) | Editorial serif, optical sizes if available |
| UI / body | Inter | Tabular numerals on for data |
| Data / identifiers | JetBrains Mono | Evidence IDs, coordinates, timings |

Scale (rem, 1.25 ratio, base 1rem = 16px):
`display 3.052 / h1 2.441 / h2 1.953 / h3 1.563 / h4 1.25 / body 1 / small 0.8 / caption 0.72`.
Body line-height 1.6, headings 1.15. Measure 62–72 characters. Headings sentence case. Small caps or letter-spaced uppercase only for section labels (`caption`, 0.08em tracking).

## 4. Layout

- 12-column grid, max content width 1120px, outer gutters 24px (desktop) / 16px (tablet).
- 8px spacing base: 4, 8, 16, 24, 32, 48, 64, 96.
- Generous vertical rhythm: sections separated by 64–96px; a hairline rule is preferred to a coloured band.
- Single-column editorial reading width for prose; two-column "catalogue plate" layout for detail pages (media left, text right).

## 5. Surfaces and elevation

- Cards: `background: var(--bg-surface); border: 1px solid var(--line); border-radius: 2px;` Radius 0–4px only.
- No shadows by default. Hover on interactive cards: border colour to `--line-strong`. A single permitted shadow for popovers: `0 1px 2px rgba(17,24,39,0.06)`.
- Dividers: 1px hairlines; use `--line`.

## 6. Components

### Catalogue card (landmark)
Plate image/silhouette on top, small caps label (`LANDMARK 03`), serif title, one-line descriptor, hairline, three metadata rows (location, period, status). No icon decoration.

### Decision card
Structure, always in this order: label (small caps) → headline answer (one sentence) → supporting lines → provenance badge → evidence chips. One card, one question.

### Provenance badge
Text pill, 1px border, no fill: `CURATED`, `DERIVED`, `ILLUSTRATIVE`. `ILLUSTRATIVE` uses the caution encoding colour for its border and text.

### Evidence chip
Mono text `ev_taj_004`, hairline border, opens the source drawer. Keyboard focusable, shows title on focus and hover.

### Confidence meter
Horizontal hairline track with a filled segment in `--accent`. Numeric value in mono beside it (`0.82`). Below the abstention threshold the fill becomes hatched grey and the label reads "Below threshold".

### Buttons
Primary: solid `--accent`, white text, 2px radius. Secondary: 1px `--line-strong` border, transparent. Tertiary: text link with underline offset. Min target 40px.

### Status pill (Ollama)
Small, top-right of header: dot + text. States: `Ollama ready`, `Loading model`, `Offline`, `Model missing`. Dot colours use the encoding palette, text always present.

### Upload dropzone
Dashed hairline border (`--line-strong`), plain instruction text, file-type and size hint. No illustration.

## 7. Motion

- Default transitions 120–160ms ease-out on colour and border only.
- Page transitions: none or a 120ms opacity fade.
- 3D: gentle orbit damping only. No continuous auto-rotation after the first interaction. Honour `prefers-reduced-motion` (disable damping animation, stop idle rotation).

## 8. Iconography and imagery

- Icons: a small custom or open-licence line set at 1.5px stroke, used sparingly (upload, external link, close, chevron). No icon-led feature grids.
- Imagery: the user's own photo, procedural 3D renders, and public-domain or properly licensed reference images listed in the Sources page. No stock illustrations.

## 9. Copy voice

Plain, specific, declarative. Examples:
- Yes: "Likely the Taj Mahal (0.84). Two cues matched: central dome, four minarets."
- No: "Our powerful AI instantly reveals the magic of history!"
Numbers carry units. Uncertainty is stated, not hidden. Empty states explain what to do next in one sentence.

## 10. Accessibility

- Text contrast AA minimum; verify `--text-muted` on `--bg-sunken`.
- Focus ring on every interactive element, never removed.
- All 3D scenes have a text alternative summarising what is shown and a keyboard path (arrow keys orbit, +/- zoom, `R` reset).
- Colour never the only carrier of meaning.
- Respect `prefers-reduced-motion` and `prefers-contrast`.
