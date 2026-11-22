import { AppError } from './errors.js';
import {
  buildRecognizeSystemPrompt,
  buildRecognizeUserMessage,
  RECOGNIZE_JSON_SCHEMA,
  RECOGNIZE_PROMPT_VERSION,
  buildAnswerSystemPrompt,
  buildAnswerUserMessage,
  ANSWER_JSON_SCHEMA,
  ANSWER_PROMPT_VERSION,
} from './prompts.js';
import type { ScoredPassage } from '../grounding/retrieval.js';
import type { OllamaState } from '@landmark/shared';

export interface OllamaHealthInfo {
  state: OllamaState;
  baseUrl: string;
  version: string | null;
  visionModel: string;
  visionModelLoaded: boolean;
  embedModel: string | null;
}

export interface ChatVisionResult {
  rawJson: Record<string, unknown>;
  promptVersion: string;
  timings: {
    queueMs: number;
    loadMs: number;
    promptEvalMs: number;
    generationMs: number;
    totalMs: number;
  };
  cold: boolean;
}

export interface AnswerQuestionResult {
  rawJson: Record<string, unknown>;
  promptVersion: string;
}

export class OllamaClient {
  private baseUrl: string;
  private visionModel: string;
  private embedModel: string | null;
  private connectTimeoutMs: number;
  private coldTimeoutMs: number;
  private warmTimeoutMs: number;

  constructor(
    baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    visionModel = process.env.OLLAMA_VISION_MODEL ?? 'gemma3:4b',
    embedModel = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.visionModel = visionModel;
    this.embedModel = embedModel || null;
    this.connectTimeoutMs = Number(process.env.OLLAMA_CONNECT_TIMEOUT_MS ?? 3000);
    this.coldTimeoutMs = Number(process.env.OLLAMA_COLD_TIMEOUT_MS ?? 90000);
    this.warmTimeoutMs = Number(process.env.OLLAMA_WARM_TIMEOUT_MS ?? 45000);
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public async getHealth(): Promise<OllamaHealthInfo> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.connectTimeoutMs);

      let version: string | null = null;
      try {
        const verRes = await fetch(`${this.baseUrl}/api/version`, { signal: controller.signal });
        if (verRes.ok) {
          const vData = (await verRes.json()) as { version?: string };
          version = vData.version || null;
        }
      } catch {
        clearTimeout(timer);
        return {
          state: 'unreachable',
          baseUrl: this.baseUrl,
          version: null,
          visionModel: this.visionModel,
          visionModelLoaded: false,
          embedModel: this.embedModel,
        };
      }
      clearTimeout(timer);

      const tagsRes = await fetch(`${this.baseUrl}/api/tags`);
      if (!tagsRes.ok) throw new Error('Tags request failed');
      const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string; model?: string }> };
      const modelNames = (tagsData.models || []).map((m) => m.name || m.model || '');

      const modelExists = modelNames.some(
        (n) => n === this.visionModel || n.startsWith(`${this.visionModel}:`) || n.includes(this.visionModel)
      );

      if (!modelExists) {
        return {
          state: 'model_missing',
          baseUrl: this.baseUrl,
          version,
          visionModel: this.visionModel,
          visionModelLoaded: false,
          embedModel: this.embedModel,
        };
      }

      let isLoaded = false;
      try {
        const psRes = await fetch(`${this.baseUrl}/api/ps`);
        if (psRes.ok) {
          const psData = (await psRes.json()) as { models?: Array<{ name: string; model?: string }> };
          const loadedNames = (psData.models || []).map((m) => m.name || m.model || '');
          isLoaded = loadedNames.some((n) => n.includes(this.visionModel));
        }
      } catch {
        // ignore ps failures
      }

      try {
        const showRes = await fetch(`${this.baseUrl}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.visionModel }),
        });
        if (showRes.ok) {
          const showData = (await showRes.json()) as { capabilities?: string[] };
          if (showData.capabilities && !showData.capabilities.includes('vision')) {
            return {
              state: 'model_not_vision',
              baseUrl: this.baseUrl,
              version,
              visionModel: this.visionModel,
              visionModelLoaded: isLoaded,
              embedModel: this.embedModel,
            };
          }
        }
      } catch {
        // ignore show probe failures
      }

      return {
        state: 'ready',
        baseUrl: this.baseUrl,
        version,
        visionModel: this.visionModel,
        visionModelLoaded: isLoaded,
        embedModel: this.embedModel,
      };
    } catch {
      return {
        state: 'unreachable',
        baseUrl: this.baseUrl,
        version: null,
        visionModel: this.visionModel,
        visionModelLoaded: false,
        embedModel: this.embedModel,
      };
    }
  }

  public async isModelLoaded(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`);
      if (!res.ok) return false;
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      return (data.models || []).some((m) => m.name?.includes(this.visionModel));
    } catch {
      return false;
    }
  }

  public async chatVision(
    imageBase64: string,
    parentSignal?: AbortSignal,
    onPhaseChange?: (phase: 'loading_model' | 'analysing') => void
  ): Promise<ChatVisionResult> {
    const isLoaded = await this.isModelLoaded();
    const timeoutMs = isLoaded ? this.warmTimeoutMs : this.coldTimeoutMs;

    if (!isLoaded && onPhaseChange) {
      onPhaseChange('loading_model');
    }

    const systemPrompt = buildRecognizeSystemPrompt();
    const userMessage = buildRecognizeUserMessage();

    const requestPayload = {
      model: this.visionModel,
      stream: false,
      keep_alive: '10m',
      options: {
        temperature: 0,
        top_p: 0.9,
        num_ctx: 4096,
        num_predict: 600,
        seed: 7,
      },
      format: RECOGNIZE_JSON_SCHEMA,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage, images: [imageBase64] },
      ],
    };

    if (onPhaseChange) {
      onPhaseChange('analysing');
    }

    let rawJson = await this.executeChatWithRetry(requestPayload, timeoutMs, parentSignal);

    if (!rawJson || !rawJson.candidates || !Array.isArray(rawJson.candidates)) {
      rawJson = await this.attemptRepair(requestPayload, rawJson, timeoutMs, parentSignal);
    }

    return {
      rawJson,
      promptVersion: RECOGNIZE_PROMPT_VERSION,
      timings: {
        queueMs: 0,
        loadMs: 0,
        promptEvalMs: 0,
        generationMs: 0,
        totalMs: 0,
      },
      cold: !isLoaded,
    };
  }

  public async answerQuestion(
    question: string,
    passages: ScoredPassage[],
    parentSignal?: AbortSignal
  ): Promise<AnswerQuestionResult> {
    const timeoutMs = this.warmTimeoutMs;
    const systemPrompt = buildAnswerSystemPrompt();
    const userMessage = buildAnswerUserMessage(question, passages);

    const requestPayload = {
      model: this.visionModel,
      stream: false,
      keep_alive: '10m',
      options: {
        temperature: 0.1, // <= 0.2 per doc 06
        top_p: 0.9,
        num_ctx: 4096,
        num_predict: 400,
        seed: 7,
      },
      format: ANSWER_JSON_SCHEMA,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    };

    const rawJson = await this.executeChatWithRetry(requestPayload, timeoutMs, parentSignal);

    return {
      rawJson,
      promptVersion: ANSWER_PROMPT_VERSION,
    };
  }

  private async executeChatWithRetry(
    payload: Record<string, unknown>,
    timeoutMs: number,
    parentSignal?: AbortSignal,
    maxRetries = 2
  ): Promise<Record<string, unknown>> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      let timer: NodeJS.Timeout | null = null;

      if (parentSignal) {
        if (parentSignal.aborted) throw new AppError('CANCELLED');
        parentSignal.addEventListener('abort', () => controller.abort());
      }

      timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (networkErr) {
        if (timer) clearTimeout(timer);
        if (parentSignal?.aborted) throw new AppError('CANCELLED');
        if ((networkErr as Error).name === 'AbortError') {
          throw new AppError('INFERENCE_TIMEOUT');
        }
        if (attempt <= maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 500));
          continue;
        }
        throw new AppError('OLLAMA_UNREACHABLE', { message: `Cannot connect to Ollama at ${this.baseUrl}` });
      }

      if (timer) clearTimeout(timer);

      if (response.status === 503 && attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 500));
        continue;
      }

      if (response.status === 507 || (response.status === 500 && (await response.text()).includes('memory'))) {
        throw new AppError('OLLAMA_OUT_OF_MEMORY');
      }

      if (!response.ok) {
        throw new AppError('INTERNAL', { message: `Ollama returned HTTP ${response.status}` });
      }

      let text = '';
      try {
        text = await response.text();
      } catch {
        throw new AppError('OLLAMA_UNREACHABLE');
      }

      let data: {
        message?: { content?: string };
        total_duration?: number;
      };
      try {
        data = JSON.parse(text);
      } catch {
        return { _rawText: text };
      }

      const content = data.message?.content;
      if (!content) {
        return { _rawText: '' };
      }

      try {
        return JSON.parse(content);
      } catch {
        return { _rawText: content };
      }
    }

    throw new AppError('OLLAMA_UNREACHABLE');
  }

  private async attemptRepair(
    originalPayload: Record<string, unknown>,
    faultyOutput: Record<string, unknown>,
    timeoutMs: number,
    parentSignal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const repairMessages = [
      ...((originalPayload.messages as Array<Record<string, unknown>>) || []),
      {
        role: 'assistant',
        content: JSON.stringify(faultyOutput),
      },
      {
        role: 'user',
        content:
          'Your previous response did not strictly match the required JSON schema with candidate architectural cues. Return ONLY a valid JSON object matching the schema now.',
      },
    ];

    const repairPayload = {
      ...originalPayload,
      messages: repairMessages,
    };

    try {
      const repaired = await this.executeChatWithRetry(repairPayload, timeoutMs, parentSignal, 0);
      if (repaired && repaired.candidates && Array.isArray(repaired.candidates)) {
        return repaired;
      }
    } catch {
      // repair failed
    }

    throw new AppError('MODEL_OUTPUT_INVALID', {
      message: 'The model returned an unusable or malformed response twice.',
    });
  }
}

export const ollamaClient = new OllamaClient();
