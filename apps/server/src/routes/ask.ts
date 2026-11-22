import { FastifyInstance } from 'fastify';
import { AskRequest, AskResponse } from '@landmark/shared';
import { kbStore } from '../grounding/store.js';
import { retriever } from '../grounding/retrieval.js';
import { validateClaims } from '../grounding/validator.js';
import { ollamaClient } from '../ollama/client.js';
import { inferenceQueue } from '../ollama/queue.js';
import { AppError } from '../ollama/errors.js';

export async function askRoute(app: FastifyInstance) {
  app.post('/api/ask', async (req, reply) => {
    const parseResult = AskRequest.safeParse(req.body);
    if (!parseResult.success) {
      const err = new AppError('QUESTION_INVALID', {
        message: 'Question must be non-empty and under 300 characters.',
      });
      return reply.status(err.httpStatus).send(err.toResponse());
    }

    const { landmarkId, question } = parseResult.data;

    // Validate landmark exists
    const landmark = kbStore.getLandmark(landmarkId);
    if (!landmark) {
      const err = new AppError('LANDMARK_NOT_FOUND', {
        message: `Landmark '${landmarkId}' was not found.`,
      });
      return reply.status(err.httpStatus).send(err.toResponse());
    }

    const startTime = Date.now();

    // 1. BM25 Retrieval
    const scoredPassages = retriever.retrieve(question, landmarkId);
    const topScore = scoredPassages[0]?.score || 0;

    // 2. Abstention if retrieval is insufficient
    if (scoredPassages.length === 0) {
      const response: AskResponse = {
        answered: false,
        answer: 'The knowledge base does not cover this.',
        claims: [],
        retrieval: {
          topScore: 0,
          passagesUsed: 0,
        },
        meta: {
          model: process.env.OLLAMA_VISION_MODEL ?? 'gemma3:4b',
          promptVersion: 'answer.v1',
          timings: {
            totalMs: Date.now() - startTime,
          },
        },
      };
      return reply.status(200).send(response);
    }

    // 3. Enqueue grounded Q&A generation
    const abortController = new AbortController();
    req.raw.on('close', () => abortController.abort());

    try {
      const result = await inferenceQueue.enqueue(async (workerSignal) => {
        return ollamaClient.answerQuestion(question, scoredPassages, workerSignal);
      }, abortController.signal);

      const rawJson = result.rawJson as {
        answered?: boolean;
        answer?: string;
        claims?: Array<{ text: string; evidence_ids?: string[]; evidenceIds?: string[] }>;
      };

      const allowedDocIds = new Set(scoredPassages.map((sp) => sp.passage.docId));
      const valResult = validateClaims(rawJson.claims || [], allowedDocIds);

      const isAnswered = Boolean(rawJson.answered && valResult.valid);

      const response: AskResponse = {
        answered: isAnswered,
        answer: isAnswered ? rawJson.answer || 'Answer derived from retrieved evidence.' : 'The knowledge base does not cover this.',
        claims: isAnswered ? valResult.claims : [],
        retrieval: {
          topScore,
          passagesUsed: scoredPassages.length,
        },
        meta: {
          model: process.env.OLLAMA_VISION_MODEL ?? 'gemma3:4b',
          promptVersion: result.promptVersion,
          timings: {
            totalMs: Date.now() - startTime,
          },
        },
      };

      return reply.status(200).send(response);
    } catch (err) {
      const appErr = err instanceof AppError ? err : new AppError('INTERNAL', { message: (err as Error).message });
      return reply.status(appErr.httpStatus).send(appErr.toResponse());
    }
  });
}
