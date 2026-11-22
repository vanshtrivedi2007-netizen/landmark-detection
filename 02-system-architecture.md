# 02 — System Architecture

## 1. Overview

Three local processes:

```
Browser (Vite + TypeScript + Three.js)
        │  HTTP/JSON, NDJSON stream
        ▼
API server (Node.js 20+, Fastify, TypeScript)  ── reads ──►  /data (catalogue + knowledge base, versioned files)
        │  HTTP
        ▼
Ollama  http://localhost:11434   (vision model + optional embedding model)
```

The browser never talks to Ollama directly. The API server owns prompt construction, queueing, validation, retrieval, and grounding. This keeps CORS simple, lets us enforce limits, and prevents prompt or model details leaking into the client.

## 2. Technology choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Frontend build | Vite + TypeScript | Fast dev loop, simple lazy chunking for Three.js |
| UI framework | Vanilla TS with a small component layer, or Preact | Keeps bundle small; the app has few pages |
| 3D | Three.js (tree-shaken imports), no React Three Fiber | Fewer dependencies, direct control of render loop |
| Styling | CSS custom properties + a single hand-written stylesheet (or CSS modules) | Token-driven, no utility-class sprawl |
| Backend | Node.js 20+, Fastify, Zod for validation | Typed schemas, low overhead, multipart support |
| Inference | Ollama HTTP API | Required by brief |
| Knowledge base | JSON + Markdown files in `/data`, loaded at boot | No database to install; diffable, citable |
| Retrieval | BM25 keyword index (in-process) with optional embedding rerank via Ollama | Works with zero extra models; embeddings are an upgrade |
| Fonts | Self-hosted WOFF2 | Offline requirement |
| Tests | Vitest, Playwright, a fixture-based eval harness | See doc 09 |

## 3. Repository layout (planned)

```
/
├─ docs/                    this blueprint
├─ data/
│  ├─ catalogue/            one JSON per landmark
│  ├─ evidence/             one Markdown per source document, front-matter metadata
│  ├─ geometry/             optional heightmaps, footprints (GeoJSON / PNG)
│  └─ eval/                 labelled test images + manifest.json
├─ apps/
│  ├─ web/                  Vite frontend
│  │  ├─ src/pages/         home, recognize, landmark, sources, about
│  │  ├─ src/components/    cards, badges, upload, status
│  │  ├─ src/three/         scene factory, terrain, silhouette, overlays, loop
│  │  └─ src/styles/        tokens.css, base.css, components.css
│  └─ server/
│     ├─ src/routes/        recognize, landmarks, ask, sources, health
│     ├─ src/ollama/        client, queue, prompts, schemas, errors
│     ├─ src/grounding/     index, retrieve, cite, validate
│     └─ src/config/        env loading and validation
├─ packages/shared/         shared TypeScript types and Zod schemas
├─ .env.example
└─ package.json             npm workspaces
```

## 4. Request flow: recognize

1. Client downscales image, posts multipart to `POST /api/recognize`.
2. Server validates size and type, re-encodes to JPEG, strips EXIF (including GPS).
3. Server checks Ollama health and model presence (cached for a few seconds).
4. Server enqueues the job (concurrency 1 by default). The client receives a job stream.
5. Server calls Ollama `/api/chat` with the vision prompt and a JSON schema in `format`.
6. Server validates the output against the Zod schema. One repair attempt on failure.
7. Server cross-checks candidates against the catalogue, computes final confidence and outcome.
8. Server attaches the matched landmark summary and evidence IDs and streams the final result.
9. Client renders the result view and lazily loads the 3D chunk.

## 5. State and persistence

- Uploaded images: held in memory for the duration of the job, never written to disk unless `PERSIST_UPLOADS=true` (default false, intended for the evaluation harness only).
- Knowledge base and catalogue: read-only at runtime, hot-reloaded in dev.
- Client state: URL-driven (landmark slug, result ID in memory). No localStorage needed beyond theme-neutral preferences such as reduced 3D quality.

## 6. Configuration surface (see doc 10 for full `.env`)

`OLLAMA_BASE_URL`, `OLLAMA_VISION_MODEL`, `OLLAMA_EMBED_MODEL`, timeouts, queue limits, confidence thresholds, `PORT`, `LOG_LEVEL`.

## 7. Security and privacy

- Bind the API to `127.0.0.1` by default.
- CORS restricted to the Vite dev origin and the production static origin.
- Upload limits enforced at the server regardless of client checks.
- Strip EXIF. Never log image bytes or base64.
- No analytics, no external requests at runtime. A CI check greps the built bundle for `http(s)://` hosts other than localhost.

## 8. Observability

- Structured JSON logs with request ID, job ID, timings (queue wait, model load, prompt eval, generation).
- `/api/health` returns component status; the frontend status pill reads it.
- Timings are returned in the recognize response under `meta.timings` so the UI and the evaluation harness can show them.

## 9. Key decisions and trade-offs

- **Backend proxy over direct browser to Ollama**: costs one small service, buys validation, queueing, grounding, and a stable contract.
- **File-based knowledge base over a database**: less setup and easier citation review; revisit if the corpus exceeds a few hundred documents.
- **Vanilla/Preact over a heavy framework**: the page count is small and the bundle budget is tight.
