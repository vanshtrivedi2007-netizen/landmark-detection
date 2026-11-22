# Landmark Recognition & Grounded Visitor Assistant

Local-first, privacy-preserving landmark recognition and evidence-grounded visitor decision support system. All vision and language reasoning runs on the user's local hardware via Ollama. Built as a monorepo adhering to editorial, museum-catalogue aesthetic principles (light mode only, Newsreader, Inter, JetBrains Mono typography, zero external CDN/cloud calls at runtime).

---

## 1. System Architecture

The workspace is organized as an npm workspaces monorepo:

- **`packages/shared`**: Shared Zod schemas, TypeScript types, and validation contracts (`LandmarkRecord`, `EvidenceMeta`, `EvidenceSummary`, `EvidenceDocument`, `RecognizeResult`, `AskResponse`, `HealthResponse`, `ApiError`).
- **`apps/server`**: Node.js 20+ + Fastify backend with:
  - Local Ollama HTTP client (`/api/version`, `/api/tags`, `/api/ps`, `/api/chat`).
  - Strict FIFO single-concurrency queue (`QUEUE_MAX = 4`) and cold/warm inference timeout guards.
  - Server-side Sharp image pipeline (EXIF stripping, aspect bounds, dimension check, JPEG re-encode).
  - In-memory Knowledge Base store indexing 5 seed landmarks and 25 evidence documents (`data/evidence/`).
  - Grounded BM25 retriever and citation/number/date verification engine.
  - Test harness with scriptable `FakeOllamaServer` for deterministic failure and error taxonomy testing.
- **`apps/web`**: Vite + Vanilla TypeScript SPA frontend with:
  - Accessible SPA router (Catalogue Home, Landmark Details, Sources Register, Image Recognition).
  - Lazy-loaded Three.js spatial visualizer (`apps/web/src/three/`) with procedural heightfield terrain, marching squares isoline contours, normal-based slope classification, and 5 procedural monument wireframe models.
  - Frame-time auto-tiering, render-on-demand loop (pausing on tab hide or off-screen scroll), accessible text disclosures, and 2D SVG topographic fallback.
  - Side-by-side photo vs schematic massing comparison in recognition flow.
  - Slide-over evidence drawer and grounded Q&A box component.

---

## 2. Prerequisites & Setup

### Prerequisites
- **Node.js**: v20+ or v22+ LTS
- **Ollama**: Local instance running at `http://localhost:11434`
- **Vision Model**: `gemma3:4b` (or configured via `.env`)

### Installation & Environment Configuration
```bash
# 1. Install dependencies across workspaces
npm install

# 2. Configure environment variables (defaults to localhost:11434 and gemma3:4b)
cp .env.example .env

# 3. Pull required Ollama model
ollama pull gemma3:4b
```

---

## 3. Running Locally

```bash
# Start backend API (port 3001) and Vite frontend (port 5173) concurrently:
npm run dev
```

Visit `http://localhost:5173` in your browser. The live health status pill in the header indicates real-time Ollama readiness, loaded model state, and Knowledge Base statistics.

---

## 4. Verification & Testing Suites

| Command | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript verification across shared, server, and web |
| `npm run test` | Full unit, contract, grounding audit, and integration test suite (Vitest) |
| `npm run build` | Builds TypeScript packages and Vite production bundle |
| `npm run eval` | Runs evaluation benchmark harness against `data/eval/manifest.json` |
| `npm run audit:offline` | Scans all built assets ensuring 100% offline privacy (0 external hosts) |

---

## 5. Operational Runbook & Troubleshooting

### Problem: Status pill shows "Ollama unreachable"
- **Cause**: Ollama service is not running on `http://localhost:11434`.
- **Resolution**: Launch Ollama (`ollama serve` or start the Ollama desktop app). Verify endpoint response with `curl http://localhost:11434/api/version`.

### Problem: Status pill shows "Model missing"
- **Cause**: The configured model in `.env` (`OLLAMA_VISION_MODEL=gemma3:4b`) is not present locally.
- **Resolution**: Run `ollama pull gemma3:4b`. The server health poller detects the model within 10 seconds.

### Problem: Status pill shows "Model lacks vision capability"
- **Cause**: A text-only model (e.g. `llama3:8b`) was configured as the vision model.
- **Resolution**: Set `OLLAMA_VISION_MODEL=gemma3:4b` in `.env` and restart the server.

### Problem: Inference request returns "Queue full" (HTTP 503)
- **Cause**: More than 4 inference requests were queued simultaneously.
- **Resolution**: Concurrency is intentionally constrained to 1 to prevent GPU out-of-memory crashes on consumer laptops. Wait for the active analysis to complete before submitting a new photo.

### Problem: WebGL context interrupted or lost in 3D viewer
- **Cause**: Browser GPU reset or memory throttling.
- **Resolution**: The viewer displays an inline notice with a "Reload scene" button that gracefully re-initializes WebGL. If hardware acceleration is unavailable, the system automatically renders the 2D cartographic SVG fallback.
