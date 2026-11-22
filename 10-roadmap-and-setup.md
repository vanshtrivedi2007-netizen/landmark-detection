# 10 — Roadmap and Setup

## 1. Environment and Prerequisites

- Node.js 20+ LTS
- npm 10+
- Ollama running locally at `http://localhost:11434` with vision model (default `gemma3:4b`)

## 2. Configuration (`.env`)

See `.env.example` for reference:
- `OLLAMA_BASE_URL`: Ollama endpoint (`http://localhost:11434`)
- `OLLAMA_VISION_MODEL`: Vision model slug (`gemma3:4b`)
- `OLLAMA_EMBED_MODEL`: Embedding model slug (`nomic-embed-text`)
- `PORT`: Backend port (default `3001`)
- `LOG_LEVEL`: Log level (`info` / `debug`)
- `CONF_RECOGNIZED`: Threshold for positive recognition (default `0.60`)
- `CONF_UNCERTAIN`: Threshold for uncertain recognition (default `0.35`)
- `INFERENCE_TIMEOUT_MS`: Max generation timeout (default `120000`)
- `QUEUE_MAX`: Max concurrent queue size (default `3`)
- `PERSIST_UPLOADS`: Whether to save uploaded files (default `false`)

## 3. Definition of Done

1. Build, typecheck (`tsc`), lint and tests pass.
2. Shared schemas define the single source of truth.
3. Accessible UI adhering to design system tokens and WCAG 2.2 AA.
4. No external network requests at runtime.
5. Evidence grounding maintained for every fact.

## 4. Milestones

### M0: Scaffold, Config, Tokens, Self-hosted Fonts, Empty Pages
- npm workspaces monorepo (`packages/shared`, `apps/server`, `apps/web`).
- Design system tokens (`tokens.css`, `base.css`) matching doc 03.
- Self-hosted WOFF2 fonts (Newsreader, Inter, JetBrains Mono).
- SPA router with empty page views (`/`, `/recognize`, `/landmarks/:slug`, `/sources`, `/about`).
- Health endpoint `/api/health` and status pill component.

### M1: Knowledge Base, Catalogue & Data APIs, Browsing UI
- Shared schemas for catalogue, evidence, decision cards, and provenance.
- Seed data for 5 Indian landmarks in `data/catalogue/` and 20+ evidence markdown documents in `data/evidence/`.
- In-memory Knowledge Base store with schema validation and citation link resolution.
- Backend routes: `/api/landmarks`, `/api/landmarks/:id`, `/api/landmarks/:id/evidence`, `/api/sources`, `/api/evidence/:id`.
- Frontend views: Home catalogue card grid, Landmark detail plate with decision cards and evidence register, Sources register table with CSV export.

### M2: Ollama Inference Client, Queue, Error Handling & Recognition Pipeline
- Ollama HTTP client with timeout, cancellation, abort controller, and error taxonomy (doc 06).
- FIFO inference request queue with concurrency 1 and max pending limit.
- Server-side image preprocessing (JPEG re-encode, EXIF strip, aspect bounds).
- Calibration formula and catalogue cross-check.
- Fake Ollama test server for deterministic unit and error integration tests.
- `/api/recognize` endpoint (multipart upload and streaming NDJSON).
- Frontend Recognize flow: upload dropzone, progress timeline, recognition result plate, cue matching list, decision cards.

### M3: Grounded Q&A Assistant
- BM25 indexing over evidence passages.
- Query scoping by landmark, top-k retrieval, and abstention threshold.
- Grounded prompt execution (`answer.v1`) with citation token verification.
- `/api/ask` endpoint.
- UI Q&A box with inline evidence chips and slide-over evidence drawer.

### M4: Procedural Three.js 3D Visualisation
- Lazy-loaded Three.js module complying with bundle and FPS budgets (doc 05).
- Procedural terrain mesh generation with contour and slope zone overlays.
- Procedural silhouette wireframe scene.
- Side-by-side photo and silhouette comparison.
- Canvas render-loop pause when tab hidden or offscreen, and static SVG/canvas fallback.

### M5: Evaluation, Verification & Final Polish
- Evaluation harness against test manifest.
- Contract test suite and accessibility audit (axe).
- Offline bundle audit (grep for external URLs).
- Final documentation and operational runbook.
