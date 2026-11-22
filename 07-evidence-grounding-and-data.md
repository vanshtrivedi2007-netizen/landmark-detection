# 07 — Evidence Grounding and Data

## 1. Principle

The model recognises; the knowledge base informs. Any sentence about a landmark's history, access, or site conditions that reaches the user comes from a curated evidence record, not from the model's memory.

## 2. Catalogue record (`data/catalogue/<slug>.json`)

```jsonc
{
  "id": "taj-mahal",
  "name": "Taj Mahal",
  "aliases": ["Taj", "Crown of the Palace"],
  "location": { "city": "Agra", "state": "Uttar Pradesh", "country": "India", "lat": 27.1751, "lon": 78.0421 },
  "period": "1632–1653",
  "descriptor": "Ivory-white marble mausoleum on the Yamuna riverbank.",
  "identifyingCues": [
    { "id": "central-dome", "text": "large central onion dome on a drum" },
    { "id": "four-minarets", "text": "four slender minarets at plinth corners" },
    { "id": "raised-plinth", "text": "white marble plinth with symmetrical iwan arches" }
  ],
  "confusableWith": ["humayuns-tomb"],
  "terrain": { /* TerrainSpec from doc 05 */ },
  "cards": {
    "identity":   [ { "text": "...", "evidenceIds": ["ev_taj_001"], "provenance": "curated" } ],
    "visiting":   [ { "text": "...", "evidenceIds": ["ev_taj_004"], "provenance": "curated", "asOf": "2026-10-01" } ],
    "conditions": [ { "text": "...", "evidenceIds": ["ev_taj_007"], "provenance": "curated" } ],
    "context":    [ { "text": "...", "evidenceIds": ["ev_taj_002"], "provenance": "curated" } ]
  }
}
```

Validation at boot (Zod): every `evidenceIds` entry must resolve; every card item must have ≥ 1 evidence ID unless `provenance` is `illustrative`; coordinates in valid ranges; `confusableWith` ids exist. Boot fails loudly on violations.

## 3. Evidence document (`data/evidence/<id>.md`)

Markdown with front-matter. Body is split into passages by blank-line-separated paragraphs, each addressable as `ev_taj_004#p2`.

```yaml
---
id: ev_taj_004
landmarkIds: [taj-mahal]
title: "<source title>"
publisher: "<organisation>"
type: primary | secondary | dataset
url: "<canonical URL>"
retrievedAt: 2026-10-01
publishedAt: 2024-05-10       # if known
licence: "<licence or usage note>"
reliability: high | medium | low
---
Passage text, paraphrased or short quoted excerpt with attribution.
```

Rules:
- Prefer official or scholarly sources (heritage authorities, government survey bodies, peer-reviewed or established reference works). Record the retrieval date.
- Respect licences. Store short excerpts and paraphrase; do not bulk copy copyrighted text.
- Time-sensitive facts (hours, fees, closures) MUST have `retrievedAt` and render with the "verify locally" note.
- No evidence from an LLM's own output. The knowledge base is human-curated; if an LLM assisted drafting, a human verifies each claim against its source before commit.

## 4. Provenance classes

| Class | Meaning | UI treatment |
|-------|---------|--------------|
| `curated` | Statement taken or paraphrased from a cited source | Chip(s) shown |
| `derived` | Computed by the system from other data (confidence, slope percentages from a heightmap) | Method note shown |
| `illustrative` | Procedural or schematic, not survey data | `ILLUSTRATIVE` badge, no evidence chip required, never presented as measurement |

Site-condition cards (flood, heat, seismic, slope) that use real data MUST cite a dataset record (for example a national hazard map or DEM source) with its resolution and date. Without that, the card is `illustrative` and says so in its first line.

## 5. Retrieval

1. **Indexing at boot:** tokenise passages, build an in-memory BM25 index. Passage metadata: evidence ID, landmark IDs, reliability.
2. **Query scoping:** if a landmark is known (from recognition or the page), restrict to its passages plus global passages.
3. **Scoring:** BM25 score, optionally reranked by cosine similarity using `OLLAMA_EMBED_MODEL` embeddings computed once at boot and cached to `data/.cache/embeddings.json`.
4. **Selection:** top `RETRIEVAL_TOP_K` (default 5) passages with score ≥ `RETRIEVAL_MIN_SCORE`.
5. **Abstention:** none pass the threshold → no model call, answer is "The knowledge base does not cover this."

## 6. Answer construction rules

- The answer may restate or combine retrieved passages; it may not add facts.
- Each claim carries evidence IDs; the UI renders them as chips immediately after the sentence.
- Conflicting passages: state both and cite both; do not pick silently. Reliability rank only orders display.
- Numbers, dates, and names must appear verbatim in at least one cited passage. The validator checks this with a simple token match and drops claims that fail.
- Questions seeking advice beyond the evidence (for example "is it safe to climb here today?") get the not-covered reply plus a pointer to official local sources.

## 7. Seed catalogue plan

Five landmarks for v1, configurable: `taj-mahal`, `red-fort`, `qutub-minar`, `india-gate`, `hawa-mahal`.

Per landmark minimum content:
- 3–5 identifying cues
- 6+ evidence passages across at least 3 distinct sources
- Content for all five decision cards, or an explicit "No evidence on file" state
- A terrain spec (illustrative is acceptable at v1)
- A procedural silhouette builder

Confusable pairs to test: Red Fort vs Humayun's Tomb-style red sandstone buildings; Qutub Minar vs other minarets; India Gate vs generic war memorials. Record such pairs in `confusableWith`.

## 8. Sources register

`/api/sources` serves the parsed front-matter of all evidence documents. The Sources page is generated, never hand-edited, so it cannot drift from the data.

## 9. Update workflow

1. Add or edit an evidence file with front-matter.
2. Run `npm run kb:validate` (schema, link resolution, duplicate IDs, stale `retrievedAt` older than 12 months flagged).
3. Run `npm run kb:index` to rebuild caches.
4. Review the diff; the knowledge base is code-reviewed like source.
