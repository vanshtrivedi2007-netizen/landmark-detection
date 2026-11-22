import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeBaseStore } from './store.js';
import path from 'path';

describe('KnowledgeBaseStore', () => {
  let store: KnowledgeBaseStore;

  beforeAll(() => {
    // Point to root data folder
    const catalogueDir = path.resolve(process.cwd(), '../../data/catalogue');
    const evidenceDir = path.resolve(process.cwd(), '../../data/evidence');
    store = new KnowledgeBaseStore(catalogueDir, evidenceDir);
    store.init();
  });

  it('loads all 5 seed landmarks', () => {
    const index = store.getLandmarksIndex();
    expect(index.length).toBe(5);
    const ids = index.map((l) => l.id);
    expect(ids).toContain('taj-mahal');
    expect(ids).toContain('red-fort');
    expect(ids).toContain('qutub-minar');
    expect(ids).toContain('india-gate');
    expect(ids).toContain('hawa-mahal');
  });

  it('loads 25 evidence documents', () => {
    const stats = store.getStats();
    expect(stats.documents).toBeGreaterThanOrEqual(25);
    expect(stats.passages).toBeGreaterThanOrEqual(25);
  });

  it('retrieves single landmark with full card details', () => {
    const taj = store.getLandmark('taj-mahal');
    expect(taj).toBeDefined();
    expect(taj?.name).toBe('Taj Mahal');
    expect(taj?.cards.identity.length).toBeGreaterThan(0);
    expect(taj?.identifyingCues.length).toBeGreaterThanOrEqual(3);
  });

  it('returns evidence summaries for a specific landmark', () => {
    const evList = store.getLandmarkEvidence('taj-mahal');
    expect(evList.length).toBeGreaterThanOrEqual(4);
    expect(evList[0]?.id).toMatch(/^ev_taj_/);
  });

  it('formats sources register list', () => {
    const all = store.getAllSources();
    expect(all.length).toBeGreaterThanOrEqual(25);
    const filtered = store.getAllSources('red-fort');
    expect(filtered.every((s) => s.landmarkIds.includes('red-fort'))).toBe(true);
  });
});
