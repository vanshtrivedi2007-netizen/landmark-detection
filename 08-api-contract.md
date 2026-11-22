# 08 — API Contract

Base path `/api`. JSON unless noted. Schemas live in `packages/shared` as Zod and are the source of truth; types below are descriptive.

## Conventions

- All responses include `requestId` in headers (`x-request-id`).
- Errors use one shape:

```json
{
  "error": {
    "code": "OLLAMA_UNREACHABLE",
    "message": "Ollama is not running on this computer.",
    "action": "Start Ollama, then retry.",
    "retryAfterSeconds": null,
    "details": {}
  }
}
```

- `details` never contains stack traces, file paths, or image data.

## GET `/api/health`

```json
{
  "status": "ok | degraded",
  "ollama": {
    "state": "ready | unreachable | model_missing | model_not_vision | loading",
    "baseUrl": "http://localhost:11434",
    "version": "string | null",
    "visionModel": "gemma3:4b",
    "visionModelLoaded": true,
    "embedModel": "nomic-embed-text | null"
  },
  "knowledgeBase": { "landmarks": 5, "documents": 34, "passages": 212, "validatedAt": "ISO-8601" },
  "config": { "confRecognized": 0.6, "confUncertain": 0.35 }
}
```

## POST `/api/recognize`

`multipart/form-data`, field `image` (file). Optional field `stream=true` for NDJSON progress.

Non-streaming success `200`:

```json
{
  "outcome": "recognized | uncertain | out_of_catalogue",
  "match": { "landmarkId": "taj-mahal", "name": "Taj Mahal", "confidence": 0.82, "confidenceBand": "high" },
  "candidates": [
    { "landmarkId": "taj-mahal", "confidence": 0.82, "visibleCues": ["central-dome","four-minarets"], "missingCues": [], "rationale": "string" }
  ],
  "sceneDescription": "string",
  "imageQualityIssues": ["partial_view"],
  "crossCheck": { "passed": true, "notes": [] },
  "cards": { "identity": [], "visiting": [], "conditions": [], "context": [] },
  "meta": {
    "model": "gemma3:4b",
    "promptVersion": "recognize.v1",
    "timings": { "queueMs": 12, "loadMs": 0, "promptEvalMs": 1800, "generationMs": 5400, "totalMs": 7300 },
    "cold": false
  }
}
```

`match` is `null` unless `outcome = recognized`. `cards` are populated only for `recognized`; for `uncertain`, cards are omitted and the client links to candidate pages.

Streaming (`stream=true`, `application/x-ndjson`), one JSON object per line:

```
{"type":"status","phase":"queued","position":1}
{"type":"status","phase":"loading_model"}
{"type":"status","phase":"analysing","elapsedMs":4200}
{"type":"result","data":{ ...same as non-streaming... }}
```
or `{"type":"error","error":{...}}`. Closing the connection cancels the job.

Errors: `IMAGE_INVALID 400`, `IMAGE_TOO_LARGE 413`, `IMAGE_TOO_SMALL 422`, `QUEUE_FULL 429`, `OLLAMA_UNREACHABLE 503`, `MODEL_MISSING 503`, `MODEL_NOT_VISION_CAPABLE 503`, `MODEL_LOADING 503`, `INFERENCE_TIMEOUT 504`, `QUEUE_TIMEOUT 504`, `OLLAMA_OUT_OF_MEMORY 507`, `MODEL_OUTPUT_INVALID 502`.

## GET `/api/landmarks`

Returns index entries: `id, name, aliases, location, period, descriptor, hasRealTerrainData`.

## GET `/api/landmarks/:id`

Full record: base fields, cues, `terrain` spec, `cards` with items `{ text, evidenceIds, provenance, asOf? }`. `404 LANDMARK_NOT_FOUND`.

## GET `/api/landmarks/:id/evidence`

List of evidence passage summaries relevant to the landmark: `id, title, publisher, type, retrievedAt, licence, reliability, excerpt`.

## GET `/api/evidence/:id`

Full evidence document metadata and passages. `404 EVIDENCE_NOT_FOUND`.

## POST `/api/ask`

Request:

```json
{ "landmarkId": "taj-mahal", "question": "string (≤ 300 chars)" }
```

Response `200`:

```json
{
  "answered": true,
  "answer": "string",
  "claims": [ { "text": "string", "evidenceIds": ["ev_taj_004"] } ],
  "retrieval": { "topScore": 7.2, "passagesUsed": 3 },
  "meta": { "model": "gemma3:4b", "promptVersion": "answer.v1", "timings": { "totalMs": 5100 } }
}
```

When not answerable: `answered:false`, `answer:"The knowledge base does not cover this."`, `claims:[]`. Rate limited by the same queue as recognition. Errors share the inference taxonomy plus `QUESTION_INVALID 400`.

## GET `/api/sources`

Query: `landmarkId?`, `format=json|csv`. Returns the sources register (front-matter fields for all evidence documents).

## Versioning and compatibility

- Add fields freely; never change meaning of existing ones. Breaking changes bump a `/api/v2` prefix.
- Frontend must tolerate unknown fields.
- Contract tests (doc 09) validate real responses against the shared Zod schemas.
