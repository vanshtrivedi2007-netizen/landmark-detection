import { describe, it, expect } from 'vitest';
import {
  LandmarkRecord,
  EvidenceMeta,
  Outcome,
  Provenance,
  ApiError,
} from './schemas.js';

describe('Shared Schemas', () => {
  it('validates a correct landmark record', () => {
    const raw = {
      id: 'taj-mahal',
      name: 'Taj Mahal',
      aliases: ['Taj'],
      location: { city: 'Agra', state: 'UP', country: 'India', lat: 27.17, lon: 78.04 },
      period: '1632–1653',
      descriptor: 'Mausoleum in Agra',
      identifyingCues: [{ id: 'dome', text: 'large central onion dome' }],
      confusableWith: [],
      terrain: { type: 'illustrative', elevationRange: [160, 170], footprintRadiusM: 300 },
      cards: {
        identity: [{ text: 'Built by Shah Jahan', evidenceIds: ['ev_taj_001'], provenance: 'curated' }],
        visiting: [],
        conditions: [],
        context: [],
      },
    };

    const parsed = LandmarkRecord.parse(raw);
    expect(parsed.id).toBe('taj-mahal');
    expect(parsed.cards.identity[0]?.provenance).toBe('curated');
  });

  it('validates evidence metadata', () => {
    const raw = {
      id: 'ev_taj_001',
      landmarkIds: ['taj-mahal'],
      title: 'Taj Mahal - UNESCO',
      publisher: 'UNESCO',
      type: 'primary',
      url: 'https://whc.unesco.org/en/list/252',
      retrievedAt: '2026-10-01',
      licence: 'UNESCO Terms',
      reliability: 'high',
    };

    const parsed = EvidenceMeta.parse(raw);
    expect(parsed.reliability).toBe('high');
    expect(parsed.landmarkIds).toContain('taj-mahal');
  });

  it('validates API error structure', () => {
    const raw = {
      error: {
        code: 'LANDMARK_NOT_FOUND',
        message: 'Landmark not found',
        action: 'Choose from catalogue',
        retryAfterSeconds: null,
        details: {},
      },
    };

    const parsed = ApiError.parse(raw);
    expect(parsed.error.code).toBe('LANDMARK_NOT_FOUND');
  });
});
