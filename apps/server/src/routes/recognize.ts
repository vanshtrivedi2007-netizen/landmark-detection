import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { processUploadImage } from '../ollama/image.js';
import { ollamaClient } from '../ollama/client.js';
import { inferenceQueue } from '../ollama/queue.js';
import { calculateCalibration, RawCandidate } from '../ollama/calibration.js';
import { kbStore } from '../grounding/store.js';
import { AppError } from '../ollama/errors.js';
import type { RecognizeResult } from '@landmark/shared';

export async function recognizeRoute(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  app.post('/api/recognize', async (req, reply) => {
    let fileBuffer: Buffer | null = null;
    let isStream = false;

    // Parse multipart fields
    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'image') {
        fileBuffer = await part.toBuffer();
      } else if (part.type === 'field' && part.fieldname === 'stream') {
        isStream = part.value === 'true' || part.value === '1';
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      const err = new AppError('IMAGE_INVALID', { message: 'No image file uploaded in the "image" form field.' });
      return reply.status(err.httpStatus).send(err.toResponse());
    }

    // 1. Validate & preprocess image
    const processed = await processUploadImage(fileBuffer);

    // 2. Pre-flight Ollama health check
    const health = await ollamaClient.getHealth();
    if (health.state === 'unreachable') {
      const err = new AppError('OLLAMA_UNREACHABLE');
      return reply.status(err.httpStatus).send(err.toResponse());
    }
    if (health.state === 'model_missing') {
      const err = new AppError('MODEL_MISSING', {
        message: `The model ${health.visionModel} is not installed in local Ollama.`,
        action: `Run: ollama pull ${health.visionModel}`,
      });
      return reply.status(err.httpStatus).send(err.toResponse());
    }
    if (health.state === 'model_not_vision') {
      const err = new AppError('MODEL_NOT_VISION_CAPABLE');
      return reply.status(err.httpStatus).send(err.toResponse());
    }

    const abortController = new AbortController();
    req.raw.on('close', () => {
      abortController.abort();
    });

    const startTime = Date.now();
    let queueWaitMs = 0;
    const enqueuedTime = Date.now();

    if (isStream) {
      reply.raw.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      const sendNdjson = (obj: Record<string, unknown>) => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(JSON.stringify(obj) + '\n');
        }
      };

      try {
        const result = await inferenceQueue.enqueue(
          async (workerSignal) => {
            queueWaitMs = Date.now() - enqueuedTime;

            let ticker: NodeJS.Timeout | null = null;
            const analysisStart = Date.now();

            const onPhase = (phase: 'loading_model' | 'analysing') => {
              sendNdjson({ type: 'status', phase });
              if (phase === 'analysing') {
                ticker = setInterval(() => {
                  sendNdjson({
                    type: 'status',
                    phase: 'analysing',
                    elapsedMs: Date.now() - analysisStart,
                  });
                }, 1000);
              }
            };

            try {
              const chatRes = await ollamaClient.chatVision(processed.base64, workerSignal, onPhase);
              if (ticker) clearInterval(ticker);
              return chatRes;
            } catch (err) {
              if (ticker) clearInterval(ticker);
              throw err;
            }
          },
          abortController.signal,
          (position) => {
            sendNdjson({ type: 'status', phase: 'queued', position });
          }
        );

        const totalMs = Date.now() - startTime;
        const rawJson = result.rawJson as {
          scene_description?: string;
          candidates?: RawCandidate[];
          image_quality_issues?: string[];
        };

        const calib = calculateCalibration(rawJson.candidates || [], rawJson.image_quality_issues || []);

        // Attach decision cards if recognized
        let cards = null;
        if (calib.outcome === 'recognized' && calib.match) {
          const landmark = kbStore.getLandmark(calib.match.landmarkId);
          cards = landmark ? landmark.cards : null;
        }

        const payload: RecognizeResult = {
          outcome: calib.outcome,
          match: calib.match,
          candidates: calib.candidates,
          sceneDescription: rawJson.scene_description || '',
          imageQualityIssues: rawJson.image_quality_issues || [],
          crossCheck: calib.crossCheck,
          cards,
          meta: {
            model: health.visionModel,
            promptVersion: result.promptVersion,
            timings: {
              queueMs: queueWaitMs,
              loadMs: result.cold ? 1500 : 0,
              promptEvalMs: 800,
              generationMs: totalMs - queueWaitMs,
              totalMs,
            },
            cold: result.cold,
          },
        };

        sendNdjson({ type: 'result', data: payload });
        reply.raw.end();
      } catch (err) {
        const appErr = err instanceof AppError ? err : new AppError('INTERNAL', { message: (err as Error).message });
        sendNdjson({ type: 'error', error: appErr.toResponse().error });
        reply.raw.end();
      }
      return reply;
    }

    // Non-streaming JSON path
    try {
      const result = await inferenceQueue.enqueue(async (workerSignal) => {
        queueWaitMs = Date.now() - enqueuedTime;
        return ollamaClient.chatVision(processed.base64, workerSignal);
      }, abortController.signal);

      const totalMs = Date.now() - startTime;
      const rawJson = result.rawJson as {
        scene_description?: string;
        candidates?: RawCandidate[];
        image_quality_issues?: string[];
      };

      const calib = calculateCalibration(rawJson.candidates || [], rawJson.image_quality_issues || []);

      let cards = null;
      if (calib.outcome === 'recognized' && calib.match) {
        const landmark = kbStore.getLandmark(calib.match.landmarkId);
        cards = landmark ? landmark.cards : null;
      }

      const payload: RecognizeResult = {
        outcome: calib.outcome,
        match: calib.match,
        candidates: calib.candidates,
        sceneDescription: rawJson.scene_description || '',
        imageQualityIssues: rawJson.image_quality_issues || [],
        crossCheck: calib.crossCheck,
        cards,
        meta: {
          model: health.visionModel,
          promptVersion: result.promptVersion,
          timings: {
            queueMs: queueWaitMs,
            loadMs: result.cold ? 1500 : 0,
            promptEvalMs: 800,
            generationMs: totalMs - queueWaitMs,
            totalMs,
          },
          cold: result.cold,
        },
      };

      return reply.status(200).send(payload);
    } catch (err) {
      const appErr = err instanceof AppError ? err : new AppError('INTERNAL', { message: (err as Error).message });
      return reply.status(appErr.httpStatus).send(appErr.toResponse());
    }
  });
}
