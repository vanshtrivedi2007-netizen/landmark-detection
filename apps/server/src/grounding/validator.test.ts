import { describe, it, expect, beforeAll } from 'vitest';
import { validateClaims } from './validator.js';
import { kbStore } from './store.js';

describe('M3 Citation and Claim Validator', () => {
  beforeAll(() => {
    kbStore.init();
  });

  it('accepts claims that cite valid retrieved passages and preserve numbers', () => {
    const allowed = new Set(['ev_taj_001']);
    const rawClaims = [
      {
        text: 'The Taj Mahal was commissioned in 1632 by Shah Jahan.',
        evidence_ids: ['ev_taj_001'],
      },
    ];

    const result = validateClaims(rawClaims, allowed);
    expect(result.valid).toBe(true);
    expect(result.claims.length).toBe(1);
    expect(result.claims[0]?.evidenceIds).toContain('ev_taj_001');
  });

  it('rejects claims citing evidence IDs outside the retrieved set', () => {
    const allowed = new Set(['ev_taj_001']);
    const rawClaims = [
      {
        text: 'It is open daily except Friday.',
        evidence_ids: ['ev_taj_999'], // Not in allowed set
      },
    ];

    const result = validateClaims(rawClaims, allowed);
    expect(result.valid).toBe(false);
    expect(result.claims.length).toBe(0);
    expect(result.droppedCount).toBe(1);
  });

  it('drops claims containing ungrounded numbers or dates absent from cited passage', () => {
    const allowed = new Set(['ev_taj_001']);
    const rawClaims = [
      {
        text: 'The Taj Mahal was built in 1999 at a cost of 500 million dollars.', // 1999 and 500 not in ev_taj_001
        evidence_ids: ['ev_taj_001'],
      },
    ];

    const result = validateClaims(rawClaims, allowed);
    expect(result.valid).toBe(false);
    expect(result.claims.length).toBe(0);
    expect(result.droppedCount).toBe(1);
  });
});
