import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FakeOllamaServer } from './fake-server.js';
import { OllamaClient } from './client.js';
import { InferenceQueue } from './queue.js';
import { calculateCalibration } from './calibration.js';
import { processUploadImage } from './image.js';
import { kbStore } from '../grounding/store.js';
import sharp from 'sharp';

describe('M2 Ollama Pipeline & Integration with Fake Server', () => {
  let fakeServer: FakeOllamaServer;
  let serverUrl: string;
  let client: OllamaClient;

  beforeAll(async () => {
    kbStore.init();

    fakeServer = new FakeOllamaServer();
    serverUrl = await fakeServer.start();
    client = new OllamaClient(serverUrl, 'gemma3:4b');
  });

  afterAll(async () => {
    await fakeServer.stop();
  });

  it('detects healthy Ollama and ready model status', async () => {
    fakeServer.behavior = { isModelLoaded: true };
    const health = await client.getHealth();
    expect(health.state).toBe('ready');
    expect(health.visionModelLoaded).toBe(true);
    expect(health.version).toBe('0.4.0');
  });

  it('detects when configured vision model is missing from tags', async () => {
    fakeServer.behavior = { tagsModelMissing: true };
    const health = await client.getHealth();
    expect(health.state).toBe('model_missing');
  });

  it('detects when model lacks vision capability', async () => {
    fakeServer.behavior = { showLacksVision: true };
    const health = await client.getHealth();
    expect(health.state).toBe('model_not_vision');
  });

  it('handles unreachable Ollama with appropriate AppError', async () => {
    const deadClient = new OllamaClient('http://127.0.0.1:59999');
    const health = await deadClient.getHealth();
    expect(health.state).toBe('unreachable');
  });

  it('successfully recognizes landmark and calibrates confidence', async () => {
    fakeServer.behavior = {
      isModelLoaded: true,
      chatCustomResponse: {
        scene_description: 'White marble mausoleum with dome and 4 minarets',
        candidates: [
          {
            landmark_id: 'taj-mahal',
            confidence: 0.9,
            visible_cues: ['large central onion dome on a drum', 'four slender minarets at plinth corners'],
            missing_cues: [],
            rationale: 'Dome and minarets align with Taj Mahal.',
          },
        ],
        image_quality_issues: [],
      },
    };

    const testImage = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    const processed = await processUploadImage(testImage);
    const result = await client.chatVision(processed.base64);

    expect(result.rawJson.candidates).toBeDefined();

    const calib = calculateCalibration(
      result.rawJson.candidates as any,
      (result.rawJson.image_quality_issues as string[]) || []
    );

    expect(calib.outcome).toBe('recognized');
    expect(calib.match?.name).toBe('Taj Mahal');
    expect(calib.match?.confidence).toBeGreaterThanOrEqual(0.6);
    expect(calib.match?.confidenceBand).toBe('high');
  });

  it('performs repair on malformed JSON and fails gracefully if unrepairable', async () => {
    fakeServer.behavior = { chatMalformedJson: true };

    await expect(client.chatVision('fake-base64')).rejects.toThrow('The model returned an unusable or malformed response twice.');
  });

  it('times out when inference exceeds configured timeout', async () => {
    fakeServer.behavior = { chatHangForever: true };
    const quickTimeoutClient = new OllamaClient(serverUrl, 'gemma3:4b');
    (quickTimeoutClient as any).warmTimeoutMs = 300;

    await expect(quickTimeoutClient.chatVision('fake-base64')).rejects.toThrow('Analysis took too long.');
  });

  it('enforces FIFO queue limits and rejects with QUEUE_FULL when capacity exceeded', async () => {
    const queue = new InferenceQueue(1, 2, 5000);

    const blocker = new Promise((resolve) => setTimeout(resolve, 200));
    queue.enqueue(() => blocker);
    queue.enqueue(() => blocker);
    queue.enqueue(() => blocker);

    expect(() => queue.enqueue(() => blocker)).toThrow('Too many requests waiting in queue.');
  });

  it('validates image constraints and rejects small or invalid buffers', async () => {
    const smallImage = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 100, g: 100, b: 100 } },
    })
      .jpeg()
      .toBuffer();

    await expect(processUploadImage(smallImage)).rejects.toThrow('Image resolution is too small');

    const garbage = Buffer.from('hello this is plain text');
    await expect(processUploadImage(garbage)).rejects.toThrow('That file is not a readable image.');
  });
});
