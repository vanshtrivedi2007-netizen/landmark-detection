import { kbStore } from './store.js';
import type { EvidencePassage } from '@landmark/shared';

export interface ScoredPassage {
  passage: EvidencePassage;
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'when', 'where', 'who', 'how', 'why', 'can', 'i',
  'you', 'this', 'there', 'their'
]);

const SYNONYM_EXPANSIONS: Record<string, string[]> = {
  builder: ['build', 'built', 'commissioned', 'creator', 'who'],
  built: ['build', 'builder', 'commissioned'],
  build: ['built', 'builder', 'commissioned'],
  building: ['build', 'built', 'architecture', 'monument'],
  date: ['commissioned', 'built', 'year', 'century', 'period'],
  dates: ['date', 'commissioned', 'built'],
  commissioned: ['built', 'builder', 'constructed'],
  hours: ['hour', 'timings', 'timing', 'open', 'opening', 'close', 'closing'],
  visiting: ['visit', 'visitors', 'visitor', 'tourism'],
  visitors: ['visit', 'visiting', 'visitor'],
  visitor: ['visit', 'visiting', 'visitors'],
  entry: ['enter', 'gate', 'gates', 'admission', 'ticket', 'tickets'],
  enter: ['entry', 'gate', 'admission'],
  rules: ['guidelines', 'guideline', 'security', 'prohibited'],
  guidelines: ['rules', 'guideline', 'security'],
  weather: ['climate', 'temperature', 'temperatures', 'monsoon', 'heat'],
  environmental: ['environment', 'climate', 'riverbank', 'flooding'],
  environment: ['environmental', 'climate'],
  conditions: ['condition', 'weather', 'climate'],
  architectural: ['architecture', 'style', 'styles', 'design'],
  architecture: ['architectural', 'style', 'styles', 'design'],
  styles: ['style', 'architecture', 'architectural'],
  style: ['styles', 'architecture', 'architectural'],
  construction: ['commissioned', 'built', 'commenced', 'started'],
  begun: ['commissioned', 'commenced', 'started', 'built', '1632'],
  begin: ['commissioned', 'commenced', 'started', 'built'],
  commenced: ['commissioned', 'begun', 'started', 'built'],
  resemble: ['pyramidal', 'facade', 'crown', 'resembles'],
  form: ['pyramidal', 'facade', 'crown', 'structure'],
};

export function tokenize(text: string): string[] {
  const baseTokens = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const allTokens = new Set(baseTokens);
  for (const t of baseTokens) {
    const expansions = SYNONYM_EXPANSIONS[t];
    if (expansions) {
      for (const exp of expansions) {
        allTokens.add(exp);
      }
    }
  }

  return Array.from(allTokens);
}

export class BM25Retriever {
  private k1: number;
  private b: number;
  private minScore: number;
  private topK: number;

  constructor(
    k1 = 1.2,
    b = 0.75,
    minScore = Number(process.env.RETRIEVAL_MIN_SCORE ?? 0.5),
    topK = Number(process.env.RETRIEVAL_TOP_K ?? 5)
  ) {
    this.k1 = k1;
    this.b = b;
    this.minScore = minScore;
    this.topK = topK;
  }

  public retrieve(query: string, landmarkId?: string): ScoredPassage[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    let passages = kbStore.getAllPassages();
    if (landmarkId) {
      passages = passages.filter(
        (p) => p.landmarkIds.includes(landmarkId) || p.landmarkIds.length === 0
      );
    }

    const N = passages.length;
    if (N === 0) return [];

    // Document tokenization and lengths (including document title for full context matching)
    const docTokensList = passages.map((p) => {
      const doc = kbStore.getEvidenceDoc(p.docId);
      const title = doc ? doc.title : '';
      return tokenize(`${title} ${p.text}`);
    });
    const docLens = docTokensList.map((dt) => dt.length);
    const avgdl = docLens.reduce((a, b) => a + b, 0) / N;

    // Document Frequency (DF) for query terms
    const dfMap = new Map<string, number>();
    for (const qTerm of queryTokens) {
      let count = 0;
      for (const dTokens of docTokensList) {
        if (dTokens.includes(qTerm)) count++;
      }
      dfMap.set(qTerm, count);
    }

    // Score each passage
    const scored: ScoredPassage[] = [];

    for (let i = 0; i < N; i++) {
      const p = passages[i]!;
      const dTokens = docTokensList[i]!;
      const dLen = docLens[i]!;

      // Term frequencies in this document
      const tfMap = new Map<string, number>();
      for (const t of dTokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
      }

      let score = 0;

      for (const qTerm of queryTokens) {
        const tf = tfMap.get(qTerm) || 0;
        if (tf === 0) continue;

        const df = dfMap.get(qTerm) || 0;
        // Standard Lucene/BM25 IDF formula
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + (this.b * dLen) / (avgdl || 1));

        score += idf * (numerator / denominator);
      }

      if (score >= this.minScore) {
        scored.push({
          passage: p,
          score: Math.round(score * 100) / 100,
        });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, this.topK);
  }
}

export const retriever = new BM25Retriever();
