# 06 — Local Ollama Inference Specification

All recognition and reasoning run locally through Ollama at `http://localhost:11434` (configurable via `OLLAMA_BASE_URL`, default stays loopback). This doc defines the contract, prompts, and failure handling.

## 1. Models

| Role | Default | Config |
|------|---------|--------|
| Vision / recognition | `gemma3:4b` | `OLLAMA_VISION_MODEL` |
| Embeddings (optional) | `nomic-embed-text` | `OLLAMA_EMBED_MODEL`, empty disables embedding rerank |

The server MUST NOT hard-code the model. On boot and every health check it calls `GET /api/tags` to confirm the configured model exists locally, and `GET /api/ps` to know whether it is loaded.

Capability check: after confirming the model exists, call `POST /api/show` and verify the response lists vision capability (or the model family is on an allow-list). If not, return `MODEL_NOT_VISION_CAPABLE` at boot and on health.

## 2. Client module (`server/src/ollama/`)

- `client.ts`: thin typed wrapper over `fetch` with `AbortController`, per-call timeouts, and error mapping.
- `queue.ts`: in-process FIFO with concurrency `OLLAMA_CONCURRENCY` (default 1), max length `OLLAMA_QUEUE_MAX` (default 4). Overflow returns `QUEUE_FULL` (HTTP 429) with `retryAfterSeconds`.
- `prompts.ts`: versioned prompt templates (`recognize.v1`, `answer.v1`), version string returned in response `meta`.
- `schemas.ts`: Zod schemas for model outputs and the JSON Schema passed to Ollama `format`.
- `errors.ts`: error taxonomy (section 6).

## 3. Image preparation

Client side (before upload):
- Accept `image/jpeg|png|webp`, ≤ 10 MB raw.
- Decode, apply EXIF orientation, resize so the longest side ≤ 1024 px, re-encode JPEG quality 0.85.

Server side (authoritative):
- Verify magic bytes, not just MIME.
- Reject if longer side < 224 px (`IMAGE_TOO_SMALL`) or file > limit (`IMAGE_TOO_LARGE`).
- Re-encode with `sharp` to JPEG, longest side ≤ `IMAGE_MAX_SIDE` (default 896), strip EXIF and GPS.
- Base64 encode for the Ollama `images` array. Never log it.

## 4. Recognition call

`POST {OLLAMA_BASE_URL}/api/chat`

```json
{
  "model": "<OLLAMA_VISION_MODEL>",
  "stream": false,
  "keep_alive": "10m",
  "options": { "temperature": 0, "top_p": 0.9, "num_ctx": 4096, "num_predict": 600, "seed": 7 },
  "format": { "<JSON Schema from schemas.ts>": "..." },
  "messages": [
    { "role": "system", "content": "<recognize.v1 system prompt>" },
    { "role": "user", "content": "<catalogue list + task>", "images": ["<base64>"] }
  ]
}
```

### Prompt design (recognize.v1)

System prompt intent (wording finalised during implementation, kept in `prompts.ts`):
- Role: a careful visual identification assistant. It describes what is visibly present first, then matches.
- Closed-set task: choose from the supplied catalogue (ids, names, aliases, 3–5 identifying cues each) **or** `none`.
- Must list `visible_cues` it actually sees and `missing_cues` it expected but cannot see.
- Must never invent history, dates, or facts. Recognition output contains no encyclopaedic claims.
- Must output JSON only, matching the schema.

Output schema (conceptual):

```ts
type RecognitionModelOutput = {
  scene_description: string;            // ≤ 60 words, what is visibly in the image
  candidates: Array<{                   // 1..3, sorted by confidence desc
    landmark_id: string | 'none';
    confidence: number;                 // 0..1, model-reported
    visible_cues: string[];
    missing_cues: string[];
    rationale: string;                  // ≤ 40 words
  }>;
  image_quality_issues: Array<'blurry' | 'occluded' | 'partial_view' | 'low_light' | 'unusual_angle' | 'interior' | 'not_a_landmark'>;
};
```

### Confidence calibration

Model-reported confidence is treated as a signal, not truth. Final confidence is computed server side:

```
final = clamp(
  0.55 * model_confidence
+ 0.30 * cue_overlap          // matched cues / catalogue cues for the chosen id
+ 0.15 * margin_to_second     // normalised gap between top-1 and top-2
- 0.15 * (quality_issues_penalty)
, 0, 1)
```

Weights are config constants and are tuned against the evaluation set (doc 09). Outcome rules:
- `recognized`: final ≥ `CONF_RECOGNIZED` (default 0.60) and id ≠ `none` and cross-check passes.
- `uncertain`: `CONF_UNCERTAIN` (default 0.35) ≤ final < `CONF_RECOGNIZED`, or cross-check disagrees.
- `out_of_catalogue`: id = `none`, or final < `CONF_UNCERTAIN`.

Cross-check: verify the returned `landmark_id` exists, and that at least one `visible_cue` fuzzy-matches the catalogue cues for that landmark. If the id is unknown, treat as a malformed output (section 5).

## 5. Strict handling of local inference

### 5.1 Startup and health
- On server boot: probe `GET /api/version`. Do not crash if Ollama is down; start in degraded mode and re-probe every 5 s (backoff to 30 s).
- `GET /api/health` returns `{ ollama: 'ready' | 'unreachable' | 'model_missing' | 'model_not_vision' | 'loading', model, modelLoaded, version }`.
- The frontend status pill polls `/api/health` every 10 s while visible.

### 5.2 Timeouts (all configurable)
| Phase | Env | Default |
|-------|-----|---------|
| Connect | `OLLAMA_CONNECT_TIMEOUT_MS` | 3 000 |
| Cold load + first token (model not in `ps`) | `OLLAMA_COLD_TIMEOUT_MS` | 90 000 |
| Warm generation | `OLLAMA_WARM_TIMEOUT_MS` | 45 000 |
| Embedding call | `OLLAMA_EMBED_TIMEOUT_MS` | 10 000 |
| Queue wait | `OLLAMA_QUEUE_WAIT_MS` | 60 000 |

The server picks cold vs warm timeout by checking `/api/ps` before the call. A timeout aborts the upstream request (`AbortController`), frees the queue slot, and returns `INFERENCE_TIMEOUT`.

### 5.3 Cancellation
If the client disconnects or presses Cancel, the server aborts the upstream Ollama request and removes the job from the queue. No orphaned generation.

### 5.4 Output validation and repair
1. Parse JSON. Validate with Zod.
2. On failure, one repair attempt: re-ask with a short "your previous output was invalid because X; return only valid JSON" message (temperature 0, no image resend if the model supports context, otherwise resend).
3. On second failure, return `MODEL_OUTPUT_INVALID` and log the (redacted) raw text.
4. Clamp numeric fields, truncate over-long strings, drop unknown fields.

### 5.5 Retries
- Retry only idempotent, transient failures: connection reset, HTTP 503 from Ollama while loading. Max 2 retries, exponential backoff 500 ms then 1 500 ms.
- Never retry on timeout of a running generation, invalid output (beyond the single repair), or 4xx.

### 5.6 Resource protection
- Concurrency 1 by default so a 4B model does not compete with itself for RAM/VRAM.
- `keep_alive` default `10m` after recognition; `0` is configurable for low-memory machines.
- Optional warm-up: `POST /api/generate` with empty prompt and `keep_alive` at boot or on first page load, if `OLLAMA_WARMUP=true`.
- Out-of-memory from Ollama (HTTP 500 with memory text) maps to `OLLAMA_OUT_OF_MEMORY` with guidance to use a smaller model or lower `IMAGE_MAX_SIDE`.

### 5.6b Determinism
Temperature 0 and fixed seed for recognition so evaluation runs are reproducible. The Q&A answer call also uses temperature ≤ 0.2.

### 5.7 Safety of prompts
- Catalogue text and evidence passages are inserted as quoted data blocks. The system prompt states that content inside them is reference material, not instructions, to reduce prompt-injection via a crafted image text or source document.
- Text visible in the photo (signs, captions) is described as scene content only and never followed.

### 5.8 Observability
Log per job: job ID, model, prompt version, image bytes after processing, queue wait ms, `load_duration`, `prompt_eval_duration`, `eval_duration`, `total_duration` (from Ollama response), outcome. Surface a trimmed timings object in the API response.

## 6. Error taxonomy

| Code | HTTP | Meaning | User-facing message | Recovery action |
|------|------|---------|--------------------|-----------------|
| `OLLAMA_UNREACHABLE` | 503 | Cannot connect to Ollama | "Ollama is not running on this computer." | "Start Ollama, then retry." |
| `MODEL_MISSING` | 503 | Model not pulled | "The model <name> is not installed." | Show `ollama pull <name>` command |
| `MODEL_NOT_VISION_CAPABLE` | 503 | Configured model lacks vision | "This model cannot read images." | Suggest a vision model |
| `MODEL_LOADING` | 503 | Model still loading | "The model is loading." | Auto-retry with progress |
| `QUEUE_FULL` | 429 | Too many pending jobs | "Too many requests waiting." | Retry after N seconds |
| `QUEUE_TIMEOUT` | 504 | Waited too long in queue | "Waited too long for an earlier request." | Retry |
| `INFERENCE_TIMEOUT` | 504 | Generation exceeded timeout | "Analysis took too long." | Smaller image or smaller model |
| `OLLAMA_OUT_OF_MEMORY` | 507 | Not enough memory | "Not enough memory to run this model." | Smaller model |
| `MODEL_OUTPUT_INVALID` | 502 | Unusable model output | "The model returned an unusable answer." | Retry once, try another photo |
| `IMAGE_INVALID` | 400 | Not a decodable image | "That file is not a readable image." | Choose another file |
| `IMAGE_TOO_LARGE` | 413 | Over size limit | "Image is larger than 10 MB." | Resize |
| `IMAGE_TOO_SMALL` | 422 | Too small to analyse | "Image is too small to analyse." | Larger photo |
| `CANCELLED` | 499 | User cancelled | none | none |
| `INTERNAL` | 500 | Unexpected | "Something went wrong." | Retry, check logs |

Error response format is in doc 08.

## 7. Grounded Q&A call (answer.v1)

- Retrieval happens first (doc 07). If the top passage score is below `RETRIEVAL_MIN_SCORE`, skip the model and return `answered: false` with the standard "not covered" message.
- Otherwise call `/api/chat` with the question and the retrieved passages (each with its evidence ID). Schema:

```ts
type AnswerOutput = {
  answered: boolean;
  answer: string;                       // ≤ 120 words
  claims: Array<{ text: string; evidence_ids: string[] }>;
};
```

- Post-validation: every `evidence_id` must exist and belong to the retrieved set; every claim must have ≥ 1 id; claims whose ids fail validation are dropped. If no claims survive, return `answered: false`.

## 8. Hardware guidance (documented in About and README)

- 4B-class model: roughly 8 GB free RAM recommended; slower on CPU-only machines.
- If the machine is constrained, use a smaller vision-capable model, set `IMAGE_MAX_SIDE=640`, and set `OLLAMA_KEEP_ALIVE=0` only if memory pressure requires it.
