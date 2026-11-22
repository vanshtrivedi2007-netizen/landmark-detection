import { FastifyInstance } from 'fastify';
import { kbStore } from '../grounding/store.js';

export async function landmarkRoutes(app: FastifyInstance) {
  app.get('/api/landmarks', async () => {
    return kbStore.getLandmarksIndex();
  });

  app.get('/api/landmarks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const landmark = kbStore.getLandmark(id);
    if (!landmark) {
      return reply.status(404).send({
        error: {
          code: 'LANDMARK_NOT_FOUND',
          message: `Landmark '${id}' was not found in the catalogue.`,
          action: 'Select a landmark from the catalogue index.',
          retryAfterSeconds: null,
          details: { requestedId: id },
        },
      });
    }
    return landmark;
  });

  app.get('/api/landmarks/:id/evidence', async (req) => {
    const { id } = req.params as { id: string };
    return kbStore.getLandmarkEvidence(id);
  });
}
