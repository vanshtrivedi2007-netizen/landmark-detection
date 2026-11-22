# 01 — Product Requirements

## 1. Problem

Visitors and students photograph landmarks but get either a bare label from a classifier or a fluent paragraph with no sources from a chatbot. Neither supports a decision (is this what I think it is, when should I go, what should I know about the site). This product pairs recognition with verifiable evidence and presents it as scannable decision-support cards.

## 2. Users

| Persona | Need | Success looks like |
|---------|------|--------------------|
| Curious visitor | Identify a photographed landmark and learn what matters before visiting | Correct ID with sources in under 15 seconds on a laptop |
| Student / evaluator | Inspect how the system reached its answer | Can see confidence, alternatives, and evidence trail |
| Presenter / demoer | Show a polished, offline-capable demo | Runs with no network; no layout surprises |

## 3. Goals

- G1. Recognize landmarks from a single uploaded image using a local vision model.
- G2. Verify and ground every shown fact in a local, cited knowledge base.
- G3. Present decision-support output as clear cards, not chat prose.
- G4. Provide interactive 3D context (terrain, silhouette, overlays) that stays smooth on a laptop.
- G5. Fail gracefully when Ollama, the model, or the image is the problem.

## 4. Non-goals

- Real-time camera or video recognition.
- Accounts, cloud sync, payments, social features.
- Authoritative safety, hazard, or engineering assessments. Overlays are informational.
- Recognizing arbitrary landmarks outside the catalogue (the system must say "not in catalogue").
- Mobile-first layouts (responsive down to tablet; phone is best-effort).

## 5. Functional requirements

### Recognition
- FR-1 Accept JPEG, PNG, WebP up to 10 MB. Drag-and-drop and file picker.
- FR-2 Downscale and normalize the image client-side before upload (see doc 06).
- FR-3 Return top-3 candidates with confidence in [0,1], rationale, and visible cues.
- FR-4 Return an explicit `unrecognized` outcome when the best confidence is below threshold or the model abstains.
- FR-5 Cross-check the model's answer against catalogue entries (name match, aliases, cue overlap). Disagreement lowers confidence and is surfaced.

### Evidence and answers
- FR-6 Each landmark detail page lists facts as cards, each with at least one evidence citation.
- FR-7 A visitor Q&A box answers only from retrieved evidence. If retrieval is weak it replies that the knowledge base does not cover the question.
- FR-8 A Sources page lists every document in the knowledge base with title, publisher, retrieval date, licence note.

### Decision support
- FR-9 Decision cards per landmark: Identity, Visiting guidance, Site conditions, Context, Confidence and caveats.
- FR-10 Each card shows provenance badge: `Curated`, `Derived`, or `Illustrative`.

### 3D
- FR-11 Landmark detail page includes a terrain scene and a silhouette/wireframe scene with toggleable overlays (contours, slope zones, footprint).
- FR-12 Recognition result page shows the matched landmark's silhouette beside the user's photo.
- FR-13 Scenes pause rendering when off-screen or tab hidden, and expose a static fallback image path when WebGL is unavailable.

### Operations
- FR-14 A status indicator shows Ollama reachability, configured model, and model-loaded state.
- FR-15 All inference errors map to a documented error code and a human-readable message (doc 06, 08).

## 6. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Cold recognition latency (model not loaded) | Under 60 s, with progress UI |
| NFR-2 | Warm recognition latency, 4B-class model | Under 15 s on a typical laptop; no hard guarantee, measured and reported |
| NFR-3 | 3D frame rate | 60 FPS target, 30 FPS floor on integrated GPU |
| NFR-4 | Initial JS payload (gzip) | Under 250 KB excluding lazy-loaded Three.js chunk |
| NFR-5 | Three.js chunk (gzip) | Under 200 KB, loaded only on pages that need it |
| NFR-6 | Offline | Fully functional with no internet after install |
| NFR-7 | Privacy | Uploaded images never persisted by default; in-memory only |
| NFR-8 | Accessibility | WCAG 2.2 AA contrast, keyboard operable, reduced-motion respected |
| NFR-9 | Browser support | Current Chrome, Edge, Firefox, Safari |

## 7. Success metrics (for the evaluation in doc 09)

- Top-1 accuracy on the held-out catalogue test set, reported with confusion matrix.
- Abstention precision: share of out-of-catalogue images correctly rejected.
- Citation coverage: 100% of displayed facts carry an evidence ID.
- Unsupported-claim rate in Q&A answers: 0 on the audit set.

## 8. Risks

| Risk | Mitigation |
|------|-----------|
| Small vision model confuses similar red-sandstone monuments | Catalogue cross-check, cue checklist per landmark, abstention threshold |
| Hallucinated facts | Retrieval-only answers, citation validation, abstention |
| Slow inference on low-RAM laptop | Configurable model, image downscale, queueing, honest progress UI |
| Overlays misread as real hazard data | Provenance badges, persistent "illustrative" label, doc 07 rules |
| 3D tanks FPS | Budgets in doc 05, adaptive quality tier |
