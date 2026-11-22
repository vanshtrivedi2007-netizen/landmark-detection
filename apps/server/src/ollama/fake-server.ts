import http from 'http';
import { AddressInfo } from 'net';

export type FakeOllamaBehavior = {
  versionDelayMs?: number;
  tagsDelayMs?: number;
  psDelayMs?: number;
  chatDelayMs?: number;
  chatStatusCode?: number;
  chatErrorResponse?: Record<string, unknown>;
  chatHangForever?: boolean;
  chatDropConnection?: boolean;
  chatMalformedJson?: boolean;
  chatCustomResponse?: Record<string, unknown>;
  chatFailCount?: number;
  tagsModelMissing?: boolean;
  showLacksVision?: boolean;
  isModelLoaded?: boolean;
};

export class FakeOllamaServer {
  private server: http.Server | null = null;
  public behavior: FakeOllamaBehavior = {};
  private chatCallCount = 0;

  constructor(behavior: FakeOllamaBehavior = {}) {
    this.behavior = behavior;
  }

  public async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server!.address() as AddressInfo;
        resolve(`http://127.0.0.1:${addr.port}`);
      });

      this.server.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || '';
    const method = req.method || 'GET';

    if (method === 'GET' && url === '/api/version') {
      if (this.behavior.versionDelayMs) {
        await new Promise((r) => setTimeout(r, this.behavior.versionDelayMs));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ version: '0.4.0' }));
      return;
    }

    if (method === 'GET' && url === '/api/tags') {
      if (this.behavior.tagsDelayMs) {
        await new Promise((r) => setTimeout(r, this.behavior.tagsDelayMs));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (this.behavior.tagsModelMissing) {
        res.end(JSON.stringify({ models: [] }));
      } else {
        res.end(
          JSON.stringify({
            models: [
              {
                name: 'gemma3:4b',
                model: 'gemma3:4b',
                details: { families: ['gemma3'], format: 'gguf' },
              },
            ],
          })
        );
      }
      return;
    }

    if (method === 'GET' && url === '/api/ps') {
      if (this.behavior.psDelayMs) {
        await new Promise((r) => setTimeout(r, this.behavior.psDelayMs));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (this.behavior.isModelLoaded === false) {
        res.end(JSON.stringify({ models: [] }));
      } else {
        res.end(
          JSON.stringify({
            models: [
              {
                name: 'gemma3:4b',
                model: 'gemma3:4b',
                size: 4200000000,
                expires_at: '2026-11-22T20:00:00Z',
              },
            ],
          })
        );
      }
      return;
    }

    if (method === 'POST' && url === '/api/show') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (this.behavior.showLacksVision) {
        res.end(JSON.stringify({ details: { families: ['bert'] }, capabilities: ['text'] }));
      } else {
        res.end(JSON.stringify({ details: { families: ['gemma3'] }, capabilities: ['vision'] }));
      }
      return;
    }

    if (method === 'POST' && url === '/api/chat') {
      this.chatCallCount++;

      let bodyText = '';
      req.on('data', (chunk) => {
        bodyText += chunk;
      });

      req.on('end', async () => {
        if (this.behavior.chatHangForever) {
          return;
        }

        if (this.behavior.chatDropConnection) {
          req.destroy();
          return;
        }

        if (this.behavior.chatFailCount && this.chatCallCount <= this.behavior.chatFailCount) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Model loading in progress' }));
          return;
        }

        if (this.behavior.chatStatusCode && this.behavior.chatStatusCode !== 200) {
          res.writeHead(this.behavior.chatStatusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.behavior.chatErrorResponse || { error: 'Ollama internal error' }));
          return;
        }

        if (this.behavior.chatDelayMs) {
          await new Promise((r) => setTimeout(r, this.behavior.chatDelayMs));
        }

        if (this.behavior.chatMalformedJson) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"message": {"content": "This is definitely not json...}}');
          return;
        }

        let isQa = false;
        try {
          const parsedBody = JSON.parse(bodyText);
          if (parsedBody.format?.properties?.claims) {
            isQa = true;
          }
        } catch {
          // ignore
        }

        let content: Record<string, unknown>;
        if (this.behavior.chatCustomResponse) {
          content = this.behavior.chatCustomResponse;
        } else if (isQa) {
          content = {
            answered: true,
            answer: 'The Taj Mahal is open daily except Friday, from sunrise to sunset.',
            claims: [
              {
                text: 'The Taj Mahal is open daily except Friday, from sunrise to sunset.',
                evidence_ids: ['ev_taj_004'],
              },
            ],
          };
        } else {
          content = {
            scene_description: 'An ivory-white marble mausoleum with a large central dome and four corner minarets under clear sky.',
            candidates: [
              {
                landmark_id: 'taj-mahal',
                confidence: 0.92,
                visible_cues: ['large central onion dome on a drum', 'four slender minarets at plinth corners'],
                missing_cues: [],
                rationale: 'Prominent onion dome and corner minarets match Taj Mahal.',
              },
            ],
            image_quality_issues: [],
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            model: 'gemma3:4b',
            created_at: new Date().toISOString(),
            message: {
              role: 'assistant',
              content: JSON.stringify(content),
            },
            done: true,
            total_duration: 2500000000,
            load_duration: 100000000,
            prompt_eval_duration: 600000000,
            eval_duration: 1800000000,
          })
        );
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
}
