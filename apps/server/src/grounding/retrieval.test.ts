import { describe, it, expect, beforeAll } from 'vitest';
import { BM25Retriever, tokenize } from './retrieval.js';
import { kbStore } from './store.js';

describe('M3 BM25 Retrieval & Grounding', () => {
  let retriever: BM25Retriever;

  beforeAll(() => {
    kbStore.init();
    retriever = new BM25Retriever(1.2, 0.75, 0.5, 5);
  });

  it('tokenizes text and removes stop words', () => {
    const tokens = tokenize('What are the visiting hours for the Taj Mahal?');
    expect(tokens).toContain('visiting');
    expect(tokens).toContain('hours');
    expect(tokens).toContain('taj');
    expect(tokens).toContain('mahal');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('what');
  });

  it('retrieves relevant visiting hours passage for Taj Mahal', () => {
    const results = retriever.retrieve('visiting hours gates ticket sunrise', 'taj-mahal');
    expect(results.length).toBeGreaterThan(0);
    const top = results[0]!;
    expect(top.passage.docId).toBe('ev_taj_004');
    expect(top.score).toBeGreaterThan(0.5);
  });

  it('scopes retrieval strictly to the requested landmark', () => {
    const results = retriever.retrieve('architecture sandstone fort', 'hawa-mahal');
    expect(results.every((r) => r.passage.landmarkIds.includes('hawa-mahal'))).toBe(true);
  });

  it('abstains on completely irrelevant or adversarial queries', () => {
    const results = retriever.retrieve('quantum entanglement semiconductor quantum computing', 'taj-mahal');
    expect(results.length).toBe(0);
  });
});
