import { kbStore } from '../grounding/store.js';
import type { ScoredPassage } from '../grounding/retrieval.js';

export const RECOGNIZE_PROMPT_VERSION = 'recognize.v1';
export const ANSWER_PROMPT_VERSION = 'answer.v1';

export const RECOGNIZE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    scene_description: {
      type: 'string',
      description: 'Concise description (<= 60 words) of what is visibly present in the image.',
    },
    candidates: {
      type: 'array',
      description: '1 to 3 candidate matches from the catalogue or none, sorted by confidence descending.',
      items: {
        type: 'object',
        properties: {
          landmark_id: {
            type: 'string',
            description: 'Catalogue landmark slug (e.g. taj-mahal, red-fort, qutub-minar, india-gate, hawa-mahal) or none.',
          },
          confidence: {
            type: 'number',
            description: 'Model-estimated confidence between 0 and 1.',
          },
          visible_cues: {
            type: 'array',
            items: { type: 'string' },
            description: 'Identifying architectural cues observed in the image.',
          },
          missing_cues: {
            type: 'array',
            items: { type: 'string' },
            description: 'Catalogue cues for this landmark that are absent or occluded.',
          },
          rationale: {
            type: 'string',
            description: 'Brief visual explanation (<= 40 words) for this candidate match.',
          },
        },
        required: ['landmark_id', 'confidence', 'visible_cues', 'missing_cues', 'rationale'],
      },
    },
    image_quality_issues: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['blurry', 'occluded', 'partial_view', 'low_light', 'unusual_angle', 'interior', 'not_a_landmark'],
      },
      description: 'Visual impediments detected in the photograph.',
    },
  },
  required: ['scene_description', 'candidates', 'image_quality_issues'],
};

export const ANSWER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answered: {
      type: 'boolean',
      description: 'True if question is answered directly by evidence passages, false otherwise.',
    },
    answer: {
      type: 'string',
      description: 'Concise, authoritative answer (<= 120 words) synthesised strictly from evidence.',
    },
    claims: {
      type: 'array',
      description: 'Individual factual claims with their citing evidence IDs.',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Sentence asserting a specific fact.' },
          evidence_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Passage IDs (e.g. ev_taj_004 or ev_taj_004#p1) justifying this statement.',
          },
        },
        required: ['text', 'evidence_ids'],
      },
    },
  },
  required: ['answered', 'answer', 'claims'],
};

export function buildRecognizeSystemPrompt(): string {
  return `You are a careful architectural visual identification assistant.
Your task is to identify whether the supplied photograph shows one of the landmarks in the curated catalogue.

Ground rules:
1. First, describe strictly what is visibly in the photograph (architecture, materials, perspective).
2. Closed-set recognition: Match only against the catalogue landmarks provided in the reference block, or return "none" if the structure does not match any entry or is not a landmark.
3. List the identifying cues that are explicitly visible, and list any typical cues that are missing or occluded.
4. Never invent historical dates, names, or ungrounded facts. Output no encyclopaedic prose.
5. Identify any photographic quality issues (blurry, occluded, partial_view, low_light, unusual_angle, interior, not_a_landmark).
6. Output valid JSON strictly conforming to the specified schema.`;
}

export function buildRecognizeUserMessage(): string {
  const catalogue = kbStore.getLandmarksIndex().map((l) => {
    const full = kbStore.getLandmark(l.id);
    return {
      id: l.id,
      name: l.name,
      aliases: l.aliases,
      descriptor: l.descriptor,
      cues: full?.identifyingCues.map((c) => c.text) || [],
    };
  });

  const catalogueBlock = JSON.stringify(catalogue, null, 2);

  return `--- BEGIN REFERENCE CATALOGUE ---
${catalogueBlock}
--- END REFERENCE CATALOGUE ---

Task:
Analyse the attached photograph against the reference catalogue above.
Identify the landmark, list visible and missing cues, estimate confidence, and return the result strictly as JSON conforming to the schema.`;
}

export function buildAnswerSystemPrompt(): string {
  return `You are a grounded museum visitor information assistant.
Answer the user's question using strictly the retrieved evidence passages provided in the reference block.

Strict Grounding Rules:
1. Grounded or silent: If the provided evidence passages do not contain facts to answer the question, set answered to false, answer to "The knowledge base does not cover this.", and claims to [].
2. Never invent dates, prices, names, or safety advice not in the passages.
3. Every claim in the claims array MUST carry the exact evidence ID(s) (e.g. ev_taj_004) from which it was derived.
4. Numbers, dates, and proper nouns in claims must appear verbatim in the cited passage.
5. Maximum length: 120 words for the answer.
6. Output valid JSON strictly conforming to the schema.`;
}

export function buildAnswerUserMessage(question: string, scoredPassages: ScoredPassage[]): string {
  const passagesText = scoredPassages
    .map((sp) => `[Evidence ID: ${sp.passage.docId} | Passage: ${sp.passage.id}]\n${sp.passage.text}`)
    .join('\n\n');

  return `--- BEGIN RETRIEVED EVIDENCE PASSAGES ---
${passagesText}
--- END RETRIEVED EVIDENCE PASSAGES ---

Visitor Question:
"${question}"

Provide a grounded answer with cited claims, or state that the knowledge base does not cover it if the passages lack sufficient information.`;
}
