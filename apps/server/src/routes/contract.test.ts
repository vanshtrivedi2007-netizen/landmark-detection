import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { AddressInfo } from 'net';
import { buildApp } from '../app.js';
import {
  HealthResponse,
  LandmarkIndex,
  LandmarkRecord,
  EvidenceSummary,
  EvidenceMeta,
  EvidenceDocument,
  AskResponse,
  ApiError,
} from '@landmark/shared';
import { z } from 'zod';

describe('M5 API Contract Tests (Zod Schema Validation)', () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health matches HealthResponse schema', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = HealthResponse.safeParse(json);
    expect(parsed.success).toBe(true);
  });

  it('GET /api/landmarks matches array of LandmarkIndex schema', async () => {
    const res = await fetch(`${baseUrl}/api/landmarks`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const schema = z.array(LandmarkIndex);
    const parsed = schema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.length).toBe(5);
  });

  it('GET /api/landmarks/:id matches LandmarkRecord schema for valid id', async () => {
    const res = await fetch(`${baseUrl}/api/landmarks/taj-mahal`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = LandmarkRecord.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe('taj-mahal');
      expect(parsed.data.cards.identity.length).toBeGreaterThan(0);
    }
  });

  it('GET /api/landmarks/:id returns 404 matching ApiError schema for unknown id', async () => {
    const res = await fetch(`${baseUrl}/api/landmarks/unknown-place`);
    expect(res.status).toBe(404);

    const json = await res.json();
    const parsed = ApiError.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('LANDMARK_NOT_FOUND');
    }
  });

  it('GET /api/landmarks/:id/evidence matches array of EvidenceSummary schema', async () => {
    const res = await fetch(`${baseUrl}/api/landmarks/taj-mahal/evidence`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const schema = z.array(EvidenceSummary);
    const parsed = schema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.length).toBe(5);
  });

  it('GET /api/sources matches array of EvidenceMeta schema', async () => {
    const res = await fetch(`${baseUrl}/api/sources`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const schema = z.array(EvidenceMeta);
    const parsed = schema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.length).toBe(25);
  });

  it('GET /api/sources.csv returns text/csv with correct headers', async () => {
    const res = await fetch(`${baseUrl}/api/sources.csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text).toContain('id,title,publisher,type,url,retrievedAt,licence');
  });

  it('GET /api/evidence/:id matches EvidenceDocument schema for valid id', async () => {
    const res = await fetch(`${baseUrl}/api/evidence/ev_taj_001`);
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = EvidenceDocument.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.id).toBe('ev_taj_001');
      expect(parsed.data.passages.length).toBeGreaterThan(0);
    }
  });

  it('GET /api/evidence/:id returns 404 matching ApiError schema for unknown id', async () => {
    const res = await fetch(`${baseUrl}/api/evidence/ev_nonexistent_999`);
    expect(res.status).toBe(404);

    const json = await res.json();
    const parsed = ApiError.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('EVIDENCE_NOT_FOUND');
    }
  });

  it('POST /api/ask returns 400 matching ApiError for missing fields', async () => {
    const res = await fetch(`${baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    const parsed = ApiError.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('QUESTION_INVALID');
    }
  });

  it('POST /api/ask matches AskResponse schema when abstaining due to low relevance', async () => {
    const res = await fetch(`${baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landmarkId: 'taj-mahal',
        question: 'xyz123 nonexistent query without match',
      }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = AskResponse.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.answered).toBe(false);
      expect(parsed.data.claims).toEqual([]);
    }
  });

  it('POST /api/recognize returns 400 matching ApiError when no image is uploaded', async () => {
    const res = await fetch(`${baseUrl}/api/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary' },
      body: '------WebKitFormBoundary--\r\n',
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    const parsed = ApiError.safeParse(json);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('IMAGE_INVALID');
    }
  });
});
