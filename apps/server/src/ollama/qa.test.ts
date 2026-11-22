import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FakeOllamaServer } from './fake-server.js';
import { OllamaClient } from './client.js';
import { retriever } from '../grounding/retrieval.js';
import { validateClaims } from '../grounding/validator.js';
import { kbStore } from '../grounding/store.js';

describe('M3 Grounded Q&A Assistant with Fake Server', () => {
  let fakeServer: FakeOllamaServer;
  let client: OllamaClient;

  beforeAll(async () => {
    kbStore.init();
    fakeServer = new FakeOllamaServer();
    const serverUrl = await fakeServer.start();
    client = new OllamaClient(serverUrl, 'gemma3:4b');
  });

  afterAll(async () => {
    await fakeServer.stop();
  });

  it('retrieves evidence, generates grounded response, and verifies citations', async () => {
    const question = 'When is the Taj Mahal open and which gates can I use?';
    const scoredPassages = retriever.retrieve(question, 'taj-mahal');

    expect(scoredPassages.length).toBeGreaterThan(0);
    const docIds = scoredPassages.map((sp) => sp.passage.docId);
    expect(docIds).toContain('ev_taj_004');

    const result = await client.answerQuestion(question, scoredPassages);
    const rawJson = result.rawJson as any;

    expect(rawJson.answered).toBe(true);
    expect(rawJson.claims.length).toBeGreaterThan(0);

    const allowed = new Set(scoredPassages.map((sp) => sp.passage.docId));
    const validated = validateClaims(rawJson.claims, allowed);

    expect(validated.valid).toBe(true);
    expect(validated.claims[0]?.evidenceIds).toContain('ev_taj_004');
  });

  it('abstains cleanly when no passages match the question', () => {
    const question = 'Can you book a submarine flight to Jupiter here?';
    const scoredPassages = retriever.retrieve(question, 'taj-mahal');
    expect(scoredPassages.length).toBe(0);
  });
});
