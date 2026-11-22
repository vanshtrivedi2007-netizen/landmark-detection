import { z } from 'zod';

export const OllamaState = z.enum([
  'ready',
  'unreachable',
  'model_missing',
  'model_not_vision',
  'loading',
]);
export type OllamaState = z.infer<typeof OllamaState>;

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  ollama: z.object({
    state: OllamaState,
    baseUrl: z.string(),
    version: z.string().nullable(),
    visionModel: z.string(),
    visionModelLoaded: z.boolean(),
    embedModel: z.string().nullable(),
  }),
  knowledgeBase: z.object({
    landmarks: z.number(),
    documents: z.number(),
    passages: z.number(),
    validatedAt: z.string(),
  }),
  config: z.object({
    confRecognized: z.number(),
    confUncertain: z.number(),
  }),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ErrorCode = z.enum([
  'OLLAMA_UNREACHABLE',
  'MODEL_MISSING',
  'MODEL_NOT_VISION_CAPABLE',
  'MODEL_LOADING',
  'INFERENCE_TIMEOUT',
  'QUEUE_TIMEOUT',
  'QUEUE_FULL',
  'OLLAMA_OUT_OF_MEMORY',
  'MODEL_OUTPUT_INVALID',
  'IMAGE_INVALID',
  'IMAGE_TOO_LARGE',
  'IMAGE_TOO_SMALL',
  'LANDMARK_NOT_FOUND',
  'EVIDENCE_NOT_FOUND',
  'QUESTION_INVALID',
  'CANCELLED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiError = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    action: z.string(),
    retryAfterSeconds: z.number().nullable().default(null),
    details: z.record(z.unknown()).default({}),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const ConfidenceBand = z.enum(['high', 'moderate', 'low']);
export type ConfidenceBand = z.infer<typeof ConfidenceBand>;

export const Provenance = z.enum(['curated', 'derived', 'illustrative']);
export type Provenance = z.infer<typeof Provenance>;

export const Outcome = z.enum(['recognized', 'uncertain', 'out_of_catalogue']);
export type Outcome = z.infer<typeof Outcome>;

export const CardItem = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  provenance: Provenance,
  asOf: z.string().optional(),
});
export type CardItem = z.infer<typeof CardItem>;

export const DecisionCards = z.object({
  identity: z.array(CardItem),
  visiting: z.array(CardItem),
  conditions: z.array(CardItem),
  context: z.array(CardItem),
  caveats: z.array(CardItem).optional().default([]),
});
export type DecisionCards = z.infer<typeof DecisionCards>;

export const IdentifyingCue = z.object({
  id: z.string(),
  text: z.string(),
});
export type IdentifyingCue = z.infer<typeof IdentifyingCue>;

export const LocationInfo = z.object({
  city: z.string(),
  state: z.string(),
  country: z.string(),
  lat: z.number(),
  lon: z.number(),
});
export type LocationInfo = z.infer<typeof LocationInfo>;

export const TerrainSpec = z.object({
  type: z.enum(['real', 'illustrative']),
  elevationRange: z.tuple([z.number(), z.number()]),
  footprintRadiusM: z.number(),
  elevationGridUrl: z.string().optional(),
});
export type TerrainSpec = z.infer<typeof TerrainSpec>;

export const LandmarkRecord = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  location: LocationInfo,
  period: z.string(),
  descriptor: z.string(),
  identifyingCues: z.array(IdentifyingCue),
  confusableWith: z.array(z.string()).default([]),
  terrain: TerrainSpec,
  cards: DecisionCards,
});
export type LandmarkRecord = z.infer<typeof LandmarkRecord>;

export const LandmarkIndex = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  location: z.string(),
  period: z.string(),
  descriptor: z.string(),
  hasRealTerrainData: z.boolean(),
});
export type LandmarkIndex = z.infer<typeof LandmarkIndex>;

export const EvidenceType = z.enum(['primary', 'secondary', 'dataset']);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const Reliability = z.enum(['high', 'medium', 'low']);
export type Reliability = z.infer<typeof Reliability>;

export const EvidenceMeta = z.object({
  id: z.string(),
  landmarkIds: z.array(z.string()),
  title: z.string(),
  publisher: z.string(),
  type: EvidenceType,
  url: z.string(),
  retrievedAt: z.string(),
  publishedAt: z.string().optional(),
  licence: z.string(),
  reliability: Reliability,
});
export type EvidenceMeta = z.infer<typeof EvidenceMeta>;

export const EvidencePassage = z.object({
  id: z.string(),
  docId: z.string(),
  landmarkIds: z.array(z.string()),
  text: z.string(),
  order: z.number(),
});
export type EvidencePassage = z.infer<typeof EvidencePassage>;

export const EvidenceSummary = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  type: EvidenceType,
  retrievedAt: z.string(),
  licence: z.string(),
  reliability: Reliability,
  excerpt: z.string(),
  url: z.string(),
  landmarks: z.array(z.string()).optional(),
});
export type EvidenceSummary = z.infer<typeof EvidenceSummary>;

export const EvidenceDocument = EvidenceMeta.extend({
  passages: z.array(z.string()),
  rawBody: z.string(),
});
export type EvidenceDocument = z.infer<typeof EvidenceDocument>;

export const CandidateMatch = z.object({
  landmarkId: z.string(),
  confidence: z.number(),
  visibleCues: z.array(z.string()),
  missingCues: z.array(z.string()),
  rationale: z.string(),
});
export type CandidateMatch = z.infer<typeof CandidateMatch>;

export const RecognizeMatch = z.object({
  landmarkId: z.string(),
  name: z.string(),
  confidence: z.number(),
  confidenceBand: ConfidenceBand,
});
export type RecognizeMatch = z.infer<typeof RecognizeMatch>;

export const CrossCheckResult = z.object({
  passed: z.boolean(),
  notes: z.array(z.string()),
});
export type CrossCheckResult = z.infer<typeof CrossCheckResult>;

export const RecognizeResult = z.object({
  outcome: Outcome,
  match: RecognizeMatch.nullable(),
  candidates: z.array(CandidateMatch),
  sceneDescription: z.string(),
  imageQualityIssues: z.array(z.string()),
  crossCheck: CrossCheckResult,
  cards: DecisionCards.nullable().optional(),
  meta: z.object({
    model: z.string(),
    promptVersion: z.string(),
    timings: z.object({
      queueMs: z.number(),
      loadMs: z.number(),
      promptEvalMs: z.number(),
      generationMs: z.number(),
      totalMs: z.number(),
    }),
    cold: z.boolean(),
  }),
});
export type RecognizeResult = z.infer<typeof RecognizeResult>;

export const AskClaim = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()),
});
export type AskClaim = z.infer<typeof AskClaim>;

export const AskRequest = z.object({
  landmarkId: z.string(),
  question: z.string().max(300),
});
export type AskRequest = z.infer<typeof AskRequest>;

export const AskResponse = z.object({
  answered: z.boolean(),
  answer: z.string(),
  claims: z.array(AskClaim),
  retrieval: z.object({
    topScore: z.number(),
    passagesUsed: z.number(),
  }),
  meta: z.object({
    model: z.string(),
    promptVersion: z.string(),
    timings: z.object({
      totalMs: z.number(),
    }),
  }),
});
export type AskResponse = z.infer<typeof AskResponse>;

export const StreamStatusPhase = z.enum(['queued', 'loading_model', 'analysing']);
export type StreamStatusPhase = z.infer<typeof StreamStatusPhase>;

export const StreamEvent = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status'),
    phase: StreamStatusPhase,
    position: z.number().optional(),
    elapsedMs: z.number().optional(),
  }),
  z.object({
    type: z.literal('result'),
    data: RecognizeResult,
  }),
  z.object({
    type: z.literal('error'),
    error: ApiError.shape.error,
  }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;

