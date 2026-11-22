# 09 — Testing and Quality

## 1. Test layers

| Layer | Tooling | Scope |
|-------|---------|-------|
| Unit | Vitest | Confidence formula, cue matching, BM25 retrieval, citation validator, noise/contours/slope math, queue behaviour |
| Contract | Vitest + Zod | Every API response validates against shared schemas |
| Ollama integration (mocked) | Vitest + a fake Ollama HTTP server | All error paths in doc 06 (timeouts, 503 loading, invalid JSON, OOM, disconnect) |
| Ollama integration (real) | Manual / opt-in script | Runs the evaluation set against the actual local model |
| UI / E2E | Playwright | Core flows, states, accessibility checks (axe) |
| Visual regression | Playwright screenshots | Light theme pages at 1280 and 1024 widths |
| Performance | Playwright tracing + a frame-time probe | 3D frame times, bundle size, first paint |
| Static checks | ESLint, tsc, a "no external hosts" bundle grep | Offline guarantee |

## 2. Fake Ollama server (for deterministic tests)

A small Node server that mimics `/api/version`, `/api/tags`, `/api/ps`, `/api/show`, `/api/chat`, `/api/generate`, `/api/embeddings` with scriptable behaviour: delay, 503 for N calls, hang forever, return malformed JSON, return unknown landmark id, drop the connection mid-response. Each scenario in doc 06 section 5 and section 6 has at least one test.

## 3. Evaluation set (`data/eval/`)

- Per landmark: at least 20 images, varied by angle, distance, lighting, weather, crowding, partial occlusion. Source images with licences recorded in `manifest.json`.
- Out-of-catalogue set: at least 30 images, including look-alikes (similar red sandstone forts, other minarets, other war memorials) and non-landmarks (street scenes, interiors, food, people).
- Quality-stress set: blurry, low-light, very small, heavily cropped.
- Split: tuning (30%) used to set confidence weights and thresholds; held-out (70%) used only for the final report. Never tune on held-out data.

### Metrics reported
- Top-1 and top-3 accuracy per landmark and overall, with confusion matrix.
- Out-of-catalogue rejection rate and false-accept rate.
- Calibration: reliability table by confidence bin (expected vs observed accuracy), and expected calibration error.
- `uncertain` rate and the accuracy of the `recognized` subset.
- Latency: median and p90 for cold and warm, per hardware profile.
- Cost of abstention: share of correct images pushed into `uncertain`.

### Targets (initial, adjust after baseline)
- Top-1 accuracy on in-catalogue held-out images ≥ 80% among `recognized` outcomes.
- False-accept rate on out-of-catalogue ≤ 10%.
- ECE ≤ 0.10 after tuning.

## 4. Grounding audit

- A fixed set of at least 50 questions: 30 answerable from the KB, 10 unanswerable, 10 adversarial (asks for opinions, safety guarantees, prompt-injection text, facts absent from the KB).
- Checks (automated, then manual spot review of 20%):
  - Every claim has valid evidence IDs from the retrieved set.
  - Every number, date, and proper noun in the answer appears in a cited passage.
  - Unanswerable questions return `answered:false`.
  - Injection attempts do not change behaviour.
- Pass criteria: 0 unsupported claims on the audit set; 100% abstention on the unanswerable subset.

## 5. UI acceptance checklist

- All states in doc 04 reachable and visually correct (idle, queued, loading model, analysing, recognized, uncertain, out of catalogue, each error code).
- Status pill reflects real Ollama state within 10 s.
- Keyboard-only run through upload, result, evidence drawer, and 3D controls succeeds.
- axe: zero serious or critical violations on every page.
- Contrast verified for every token pair.
- Reduced motion honoured.
- No console errors or warnings on a clean run.
- No network requests to non-localhost hosts (verified in Playwright by intercepting requests).

## 6. 3D acceptance checklist

- Frame-time probe records median and p95 on Standard tier for terrain and silhouette scenes.
- Memory plateau test: navigate between all landmarks 20 times; heap and GPU resource counts (`renderer.info`) return to baseline after dispose.
- WebGL-unavailable path renders the static fallback with legend.
- Context-lost path recovers.

## 7. Definition of done for any feature

1. Unit and contract tests added and passing.
2. Relevant error paths tested with the fake Ollama server.
3. Accessibility and offline checks pass.
4. Docs updated if behaviour or contract changed.
5. Evidence records validated (`kb:validate`) if data changed.
