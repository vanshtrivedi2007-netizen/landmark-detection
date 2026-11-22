import { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@landmark/shared';
import { kbStore } from '../grounding/store.js';
import { ollamaClient } from '../ollama/client.js';

export async function healthRoute(app: FastifyInstance) {
  app.get('/api/health', async (): Promise<HealthResponse> => {
    const kbStats = kbStore.getStats();
    const ollamaHealth = await ollamaClient.getHealth();

    return {
      status: kbStats.landmarks > 0 && ollamaHealth.state === 'ready' ? 'ok' : 'degraded',
      ollama: ollamaHealth,
      knowledgeBase: {
        landmarks: kbStats.landmarks,
        documents: kbStats.documents,
        passages: kbStats.passages,
        validatedAt: kbStats.validatedAt,
      },
      config: {
        confRecognized: Number(process.env.CONF_RECOGNIZED ?? 0.6),
        confUncertain: Number(process.env.CONF_UNCERTAIN ?? 0.35),
      },
    };
  });
}
