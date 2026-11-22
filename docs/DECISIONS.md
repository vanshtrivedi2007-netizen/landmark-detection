# Decisions

- M0: Doc 10 (roadmap) does not exist on disk; M0 scope inferred from user instructions and docs 01-04.
- M0: Using path-based routing with vanilla TS SPA (history API) per doc 04 preference.
- M0: Preact deferred; starting with vanilla TS per doc 02 allowance ("Vanilla TS with a small component layer, or Preact").

- M1: Created 10-roadmap-and-setup.md matching README, 5 seed landmarks, 25 evidence documents, and in-memory Knowledge Base store.
- M2: Built Ollama client, FIFO queue, FakeOllamaServer, server-side Sharp pipeline, and streaming Recognize UI.
- M3: Built in-memory BM25 retriever, citation/claim validator, /api/ask route, and frontend Q&A box component.
- M4: Implemented lazy-loaded Three.js architecture with procedural heightfield terrain, marching squares contours, slope analysis, 5 landmark silhouettes, side-by-side comparison plate, keyboard a11y, and 2D fallback.
- M5: Delivered 50-question Grounding Audit suite, Zod API contract test suite, offline asset audit (0 external hosts), evaluation benchmark harness with reliability table, and comprehensive operational runbook in README.
