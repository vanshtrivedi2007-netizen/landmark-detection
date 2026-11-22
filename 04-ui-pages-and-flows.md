# 04 — UI Pages and Flows

Routes are hash or path based (decide at build time); the table assumes paths.

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Orient, start a recognition, browse the catalogue |
| `/recognize` | Recognize | Upload, progress, result, Q&A |
| `/landmarks/:slug` | Landmark | Catalogue plate, decision cards, 3D, evidence |
| `/sources` | Sources | Full evidence register |
| `/about` | About | Method, limits, how to run locally |

Global header: wordmark (serif, text only), nav links, Ollama status pill. Footer: version, "Runs locally. Images are not stored." and a link to Sources.

## 1. Home

1. **Masthead.** One serif headline stating what the tool does in plain words (e.g. "Identify a landmark. See the evidence."), a one-sentence subhead, one primary button "Recognize a photo".
2. **How it works.** Three numbered steps in a single row separated by hairlines: Upload, Verify against the catalogue, Read the evidence. No icons.
3. **Catalogue index.** Grid of catalogue cards, equal size, 3 columns. Sorted alphabetically.
4. **Method note.** Short paragraph: local model, cited sources, abstains when unsure. Link to About.

## 2. Recognize

Layout: two columns. Left: photo plate. Right: result and cards.

### States
| State | UI |
|-------|----|
| Idle | Dropzone, accepted formats, 10 MB limit, note on local processing |
| Preparing | Thumbnail shown, "Resizing image" |
| Queued | "Waiting for earlier request (position n)" |
| Loading model | Progress text: "Loading model into memory. First run can take up to a minute." Elapsed timer |
| Analysing | Elapsed timer, cancel button |
| Result: recognized | See below |
| Result: uncertain | Top candidates shown, neutral banner "Not confident enough to name a landmark", suggestions to retake photo |
| Result: out of catalogue | "This does not look like a landmark in the catalogue" with the model's description of what it sees |
| Error | Error panel with code, plain message, one recovery action (doc 06 mapping) |

### Recognized result layout
1. Heading: "Likely: Taj Mahal" with confidence meter.
2. Visible cues matched (list) and cues not seen (list).
3. Alternatives: up to two other candidates with their confidence.
4. Side-by-side: user photo and the landmark silhouette scene (lazy-loaded 3D).
5. Decision cards (Identity, Visiting guidance, Site conditions, Context, Confidence and caveats).
6. "Ask about this landmark" box (grounded Q&A). Answers show inline citations as evidence chips.
7. Link: "Open full landmark page".

## 3. Landmark page

Catalogue plate layout:
- Left (7 cols): tabbed 3D viewer: `Silhouette`, `Terrain`. Overlay toggles below: Contours, Slope zones, Footprint. Persistent label when data is illustrative.
- Right (5 cols): title, alternate names, location, period, short descriptor.
- Below: decision cards in a single column list, then a "Key facts" definition list, then an evidence register for this landmark.
- Evidence chips open a right-hand drawer with source title, publisher, date, excerpt, link, and licence note.

## 4. Sources

Table: ID, title, publisher, type (primary/secondary/dataset), retrieved date, licence, landmarks covered. Filter by landmark. Each row expands to show the excerpt used. Export as CSV button.

## 5. About

Method, model name and size currently configured (read from `/api/health`), known limitations, privacy statement, local setup summary, how to read confidence and provenance badges.

## 6. Cross-cutting UI rules

- Never show a fact without its chip. If a card has no evidence, it renders "No evidence on file" and the card is visually muted.
- Confidence is always numeric plus a word (`High ≥ 0.75`, `Moderate 0.50–0.74`, `Low < 0.50`; thresholds are configurable and shown in About).
- Errors never expose stack traces. They show a code (`OLLAMA_UNREACHABLE`) the user can search in About.
- Long operations show elapsed time, not an indefinite spinner.
- Every page has a meaningful `<title>` and a single `<h1>`.

## 7. Decision card definitions

| Card | Question answered | Typical content | Provenance |
|------|-------------------|-----------------|-----------|
| Identity | What is this? | Name, location, period, builder, significance | Curated |
| Visiting guidance | What should I know before going? | Opening pattern, best season/time, access notes, etiquette | Curated |
| Site conditions | What environmental factors shape the visit? | Terrain character, flood/heat/seismic context, slope notes | Curated or Illustrative |
| Context | Why does it matter? | Historical and architectural context | Curated |
| Confidence and caveats | How sure are we? | Model confidence, catalogue cross-check result, limitations | Derived |

Visiting details (opening hours, ticket prices) change often. They are only shown if the evidence record has a retrieval date, and the card displays "Verify locally; last checked <date>".
