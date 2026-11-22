import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { kbStore } from './grounding/store.js';
import { healthRoute } from './routes/health.js';
import { landmarkRoutes } from './routes/landmarks.js';
import { sourceRoutes } from './routes/sources.js';
import { recognizeRoute } from './routes/recognize.js';
import { askRoute } from './routes/ask.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root dist path for apps/web/dist in both dev and production
const webDistPath = path.resolve(__dirname, '..', '..', 'web', 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export async function buildApp(): Promise<FastifyInstance> {
  // Ensure KB store is initialised
  kbStore.init();

  const app = Fastify({ logger: false });

  // Flexible CORS for Render and local development
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  // API Routes
  await app.register(healthRoute);
  await app.register(landmarkRoutes);
  await app.register(sourceRoutes);
  await app.register(recognizeRoute);
  await app.register(askRoute);

  // Serve static frontend assets (Production on Render & Local preview)
  const serveStaticOrSpa = async (req: any, reply: any) => {
    // Don't intercept API routes
    if (req.url.startsWith('/api/')) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method}:${req.url} not found`,
          action: 'Check API documentation.',
          retryAfterSeconds: null,
          details: {},
        },
      });
    }

    if (fs.existsSync(webDistPath)) {
      const cleanPath = req.url.split('?')[0] || '/';
      const relativePath = (cleanPath === '/' || cleanPath === '') ? 'index.html' : cleanPath.replace(/^\/+/, '');
      const filePath = path.join(webDistPath, relativePath);

      // Prevent directory traversal
      if (!filePath.startsWith(webDistPath)) {
        return reply.status(403).send('Forbidden');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        reply.header('Content-Type', contentType);
        return reply.send(fs.createReadStream(filePath));
      }

      // SPA client-side routing fallback to index.html
      const indexPath = path.join(webDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        reply.header('Content-Type', 'text/html; charset=utf-8');
        return reply.send(fs.createReadStream(indexPath));
      }
    }

    // If dist is not yet built, redirect root to local Vite dev server
    if (req.url === '/' || req.url === '') {
      return reply.redirect('http://localhost:5173');
    }

    return reply.status(404).send('Not Found');
  };

  app.get('/', serveStaticOrSpa);
  app.get('/*', serveStaticOrSpa);
  app.setNotFoundHandler(serveStaticOrSpa);

  return app;
}
