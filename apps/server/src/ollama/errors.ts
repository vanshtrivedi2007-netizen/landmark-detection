import { ErrorCode, ApiError } from '@landmark/shared';

export interface ErrorDetails {
  code: ErrorCode;
  httpStatus: number;
  message: string;
  action: string;
  retryAfterSeconds?: number | null;
  details?: Record<string, unknown>;
}

export const ERROR_TAXONOMY: Record<ErrorCode, { httpStatus: number; message: string; action: string }> = {
  OLLAMA_UNREACHABLE: {
    httpStatus: 503,
    message: 'Ollama is not running on this computer.',
    action: 'Start Ollama, then retry.',
  },
  MODEL_MISSING: {
    httpStatus: 503,
    message: 'The model is not installed.',
    action: 'Run: ollama pull <model-name>',
  },
  MODEL_NOT_VISION_CAPABLE: {
    httpStatus: 503,
    message: 'This model cannot read images.',
    action: 'Configure a vision-capable model in .env (e.g. gemma3:4b).',
  },
  MODEL_LOADING: {
    httpStatus: 503,
    message: 'The model is loading into memory.',
    action: 'Auto-retrying with progress.',
  },
  QUEUE_FULL: {
    httpStatus: 429,
    message: 'Too many requests waiting in queue.',
    action: 'Wait a few seconds and retry.',
  },
  QUEUE_TIMEOUT: {
    httpStatus: 504,
    message: 'Waited too long for an earlier request.',
    action: 'Retry the analysis.',
  },
  INFERENCE_TIMEOUT: {
    httpStatus: 504,
    message: 'Analysis took too long.',
    action: 'Try with a smaller image or a lighter model.',
  },
  OLLAMA_OUT_OF_MEMORY: {
    httpStatus: 507,
    message: 'Not enough memory to run this model.',
    action: 'Use a smaller model or lower image resolution.',
  },
  MODEL_OUTPUT_INVALID: {
    httpStatus: 502,
    message: 'The model returned an unusable answer.',
    action: 'Retry once, or try another photo.',
  },
  IMAGE_INVALID: {
    httpStatus: 400,
    message: 'That file is not a readable image.',
    action: 'Upload a valid JPEG, PNG, or WebP image.',
  },
  IMAGE_TOO_LARGE: {
    httpStatus: 413,
    message: 'Image is larger than 10 MB limit.',
    action: 'Resize the image before uploading.',
  },
  IMAGE_TOO_SMALL: {
    httpStatus: 422,
    message: 'Image is too small to analyse (longest side must be at least 224px).',
    action: 'Upload a higher-resolution photograph.',
  },
  LANDMARK_NOT_FOUND: {
    httpStatus: 404,
    message: 'Landmark was not found in the catalogue.',
    action: 'Select a landmark from the catalogue index.',
  },
  EVIDENCE_NOT_FOUND: {
    httpStatus: 404,
    message: 'Evidence document was not found.',
    action: 'Check the evidence ID in the sources register.',
  },
  QUESTION_INVALID: {
    httpStatus: 400,
    message: 'Question is empty or exceeds 300 characters.',
    action: 'Keep question concise and specific to the landmark.',
  },
  CANCELLED: {
    httpStatus: 499,
    message: 'Analysis cancelled by user.',
    action: 'Upload or retry when ready.',
  },
  INTERNAL: {
    httpStatus: 500,
    message: 'Something went wrong.',
    action: 'Check logs and retry.',
  },
};

export class AppError extends Error {
  public code: ErrorCode;
  public httpStatus: number;
  public action: string;
  public retryAfterSeconds: number | null;
  public details: Record<string, unknown>;

  constructor(code: ErrorCode, overrides?: { message?: string; action?: string; retryAfterSeconds?: number | null; details?: Record<string, unknown> }) {
    const meta = ERROR_TAXONOMY[code] || ERROR_TAXONOMY.INTERNAL;
    const msg = overrides?.message || meta.message;
    super(msg);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = meta.httpStatus;
    this.action = overrides?.action || meta.action;
    this.retryAfterSeconds = overrides?.retryAfterSeconds ?? null;
    this.details = overrides?.details || {};
  }

  public toResponse() {
    return ApiError.parse({
      error: {
        code: this.code,
        message: this.message,
        action: this.action,
        retryAfterSeconds: this.retryAfterSeconds,
        details: this.details,
      },
    });
  }
}
