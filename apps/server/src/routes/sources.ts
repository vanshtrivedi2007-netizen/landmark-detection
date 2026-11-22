import { FastifyInstance } from 'fastify';
import { kbStore } from '../grounding/store.js';

export async function sourceRoutes(app: FastifyInstance) {
  const handleCsv = (sources: any[], reply: any) => {
    const header = 'id,title,publisher,type,url,retrievedAt,licence,reliability,landmarkIds\n';
    const rows = sources
      .map((s) => {
        const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
        return [
          escape(s.id),
          escape(s.title),
          escape(s.publisher),
          escape(s.type),
          escape(s.url),
          escape(s.retrievedAt),
          escape(s.licence),
          escape(s.reliability),
          escape(s.landmarkIds.join(';')),
        ].join(',');
      })
      .join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="sources.csv"');
    return header + rows;
  };

  app.get('/api/sources.csv', async (req, reply) => {
    const { landmarkId } = req.query as { landmarkId?: string };
    const sources = kbStore.getAllSources(landmarkId);
    return handleCsv(sources, reply);
  });

  app.get('/api/sources', async (req, reply) => {
    const { landmarkId, format } = req.query as { landmarkId?: string; format?: string };
    const sources = kbStore.getAllSources(landmarkId);

    if (format === 'csv') {
      return handleCsv(sources, reply);
    }

    return sources;
  });

  app.get('/api/evidence/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = kbStore.getEvidenceDoc(id);
    if (!doc) {
      return reply.status(404).send({
        error: {
          code: 'EVIDENCE_NOT_FOUND',
          message: `Evidence document '${id}' not found.`,
          action: 'Check the evidence ID in the sources register.',
          retryAfterSeconds: null,
          details: { requestedId: id },
        },
      });
    }
    return doc;
  });
}
