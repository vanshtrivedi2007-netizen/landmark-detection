import { AppError } from './errors.js';

export interface QueueJob<T> {
  id: string;
  run: (signal: AbortSignal) => Promise<T>;
  signal?: AbortSignal;
  onPositionUpdate?: (position: number) => void;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  enqueuedAt: number;
}

export class InferenceQueue {
  private queue: QueueJob<unknown>[] = [];
  private activeCount = 0;
  private concurrency: number;
  private maxPending: number;
  private timeoutMs: number;

  constructor(
    concurrency = Number(process.env.OLLAMA_CONCURRENCY ?? 1),
    maxPending = Number(process.env.QUEUE_MAX ?? 3),
    timeoutMs = Number(process.env.OLLAMA_QUEUE_WAIT_MS ?? 60000)
  ) {
    this.concurrency = concurrency;
    this.maxPending = maxPending;
    this.timeoutMs = timeoutMs;
  }

  public enqueue<T>(
    run: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    onPositionUpdate?: (pos: number) => void
  ): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(new AppError('CANCELLED'));
    }

    if (this.queue.length >= this.maxPending) {
      throw new AppError('QUEUE_FULL', { retryAfterSeconds: 5 });
    }

    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      let timer: NodeJS.Timeout | null = null;

      const job: QueueJob<T> = {
        id: Math.random().toString(36).substring(2, 9),
        run,
        signal: controller.signal,
        onPositionUpdate,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };

      // Listen to parent abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
          this.removeJob(job.id);
          if (timer) clearTimeout(timer);
          reject(new AppError('CANCELLED'));
        });
      }

      // Queue wait timeout
      timer = setTimeout(() => {
        controller.abort();
        this.removeJob(job.id);
        reject(new AppError('QUEUE_TIMEOUT'));
      }, this.timeoutMs);

      this.queue.push(job as QueueJob<unknown>);
      this.notifyPositions();
      this.processNext();
    });
  }

  private removeJob(id: string) {
    const idx = this.queue.findIndex((j) => j.id === id);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.notifyPositions();
    }
  }

  private notifyPositions() {
    this.queue.forEach((job, index) => {
      if (job.onPositionUpdate) {
        job.onPositionUpdate(index + 1);
      }
    });
  }

  private async processNext() {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift()!;
    this.activeCount++;
    this.notifyPositions();

    const controller = new AbortController();
    if (job.signal) {
      job.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const result = await job.run(controller.signal);
      job.resolve(result);
    } catch (err) {
      job.reject(err);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }
}

export const inferenceQueue = new InferenceQueue();
