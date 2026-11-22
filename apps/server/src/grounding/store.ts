import fs from 'fs';
import path from 'path';
import {
  LandmarkRecord,
  LandmarkIndex,
  EvidenceMeta,
  EvidencePassage,
  EvidenceSummary,
  EvidenceDocument,
} from '@landmark/shared';

export interface KBStats {
  landmarks: number;
  documents: number;
  passages: number;
  validatedAt: string;
}

export class KnowledgeBaseStore {
  private landmarks = new Map<string, LandmarkRecord>();
  private evidenceDocs = new Map<string, EvidenceDocument>();
  private passages: EvidencePassage[] = [];
  private stats: KBStats = {
    landmarks: 0,
    documents: 0,
    passages: 0,
    validatedAt: new Date().toISOString(),
  };

  constructor(
    private catalogueDir = path.resolve(process.cwd(), '../../data/catalogue'),
    private evidenceDir = path.resolve(process.cwd(), '../../data/evidence')
  ) {
    // If running from app root or server workspace
    if (!fs.existsSync(this.catalogueDir)) {
      this.catalogueDir = path.resolve(process.cwd(), 'data/catalogue');
      this.evidenceDir = path.resolve(process.cwd(), 'data/evidence');
    }
  }

  public init() {
    this.loadEvidence();
    this.loadCatalogue();
    this.validateCitations();
    this.stats = {
      landmarks: this.landmarks.size,
      documents: this.evidenceDocs.size,
      passages: this.passages.length,
      validatedAt: new Date().toISOString(),
    };
  }

  private parseFrontMatter(content: string): { meta: Record<string, string | string[]>; body: string } {
    const lines = content.split('\n');
    if (lines[0]?.trim() !== '---') {
      return { meta: {}, body: content };
    }

    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        endIdx = i;
        break;
      }
    }

    if (endIdx === -1) {
      return { meta: {}, body: content };
    }

    const fmLines = lines.slice(1, endIdx);
    const body = lines.slice(endIdx + 1).join('\n').trim();
    const meta: Record<string, string | string[]> = {};

    for (const line of fmLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim();
      let rawVal = line.slice(colonIdx + 1).trim();

      // Check array syntax: [item1, item2]
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1, -1).trim();
        meta[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : [];
      } else {
        // Unquote string if quoted
        if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
          rawVal = rawVal.slice(1, -1);
        }
        meta[key] = rawVal;
      }
    }

    return { meta, body };
  }

  private loadEvidence() {
    if (!fs.existsSync(this.evidenceDir)) return;
    const files = fs.readdirSync(this.evidenceDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const fullPath = path.join(this.evidenceDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { meta, body } = this.parseFrontMatter(raw);

      const parsedMeta = EvidenceMeta.parse({
        id: meta.id || path.basename(file, '.md'),
        landmarkIds: Array.isArray(meta.landmarkIds) ? meta.landmarkIds : [meta.landmarkIds].filter(Boolean),
        title: meta.title || 'Untitled',
        publisher: meta.publisher || 'Unknown',
        type: meta.type || 'secondary',
        url: meta.url || '',
        retrievedAt: meta.retrievedAt || new Date().toISOString().split('T')[0],
        publishedAt: meta.publishedAt || undefined,
        licence: meta.licence || 'Public Domain',
        reliability: meta.reliability || 'medium',
      });

      // Split paragraphs by blank lines
      const rawPassages = body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const doc: EvidenceDocument = {
        ...parsedMeta,
        passages: rawPassages,
        rawBody: body,
      };

      this.evidenceDocs.set(doc.id, doc);

      rawPassages.forEach((text, idx) => {
        this.passages.push({
          id: `${doc.id}#p${idx + 1}`,
          docId: doc.id,
          landmarkIds: doc.landmarkIds,
          text,
          order: idx + 1,
        });
      });
    }
  }

  private loadCatalogue() {
    if (!fs.existsSync(this.catalogueDir)) return;
    const files = fs.readdirSync(this.catalogueDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const fullPath = path.join(this.catalogueDir, file);
      const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const record = LandmarkRecord.parse(raw);
      this.landmarks.set(record.id, record);
    }
  }

  private validateCitations() {
    for (const [landmarkId, lm] of this.landmarks.entries()) {
      const cardCategories = [lm.cards.identity, lm.cards.visiting, lm.cards.conditions, lm.cards.context, lm.cards.caveats || []];
      for (const cardList of cardCategories) {
        for (const card of cardList) {
          for (const evId of card.evidenceIds) {
            const baseId = evId.split('#')[0]!;
            if (!this.evidenceDocs.has(baseId)) {
              console.warn(`[KB Validation Warning] Missing evidence ${baseId} referenced by landmark ${landmarkId}`);
            }
          }
        }
      }
    }
  }

  public getLandmarksIndex(): LandmarkIndex[] {
    return Array.from(this.landmarks.values())
      .map((lm) => ({
        id: lm.id,
        name: lm.name,
        aliases: lm.aliases,
        location: `${lm.location.city}, ${lm.location.state}, ${lm.location.country}`,
        period: lm.period,
        descriptor: lm.descriptor,
        hasRealTerrainData: lm.terrain.type === 'real',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public getLandmark(id: string): LandmarkRecord | undefined {
    return this.landmarks.get(id);
  }

  public getLandmarkEvidence(id: string): EvidenceSummary[] {
    const results: EvidenceSummary[] = [];
    for (const doc of this.evidenceDocs.values()) {
      if (doc.landmarkIds.includes(id)) {
        results.push({
          id: doc.id,
          title: doc.title,
          publisher: doc.publisher,
          type: doc.type,
          retrievedAt: doc.retrievedAt,
          licence: doc.licence,
          reliability: doc.reliability,
          excerpt: doc.passages[0] || doc.rawBody.slice(0, 200),
          url: doc.url,
          landmarks: doc.landmarkIds,
        });
      }
    }
    return results;
  }

  public getAllSources(landmarkId?: string): EvidenceMeta[] {
    const list: EvidenceMeta[] = [];
    for (const doc of this.evidenceDocs.values()) {
      if (!landmarkId || doc.landmarkIds.includes(landmarkId)) {
        const { passages: _, rawBody: __, ...meta } = doc;
        list.push(meta);
      }
    }
    return list.sort((a, b) => a.id.localeCompare(b.id));
  }

  public getEvidenceDoc(id: string): EvidenceDocument | undefined {
    const baseId = id.split('#')[0]!;
    return this.evidenceDocs.get(baseId);
  }

  public getStats(): KBStats {
    return this.stats;
  }

  public getAllPassages(): EvidencePassage[] {
    return this.passages;
  }
}

export const kbStore = new KnowledgeBaseStore();
