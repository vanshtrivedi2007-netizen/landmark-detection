import sharp, { Metadata } from 'sharp';
import { AppError } from './errors.js';

export interface ProcessedImage {
  buffer: Buffer;
  base64: string;
  width: number;
  height: number;
}

export function verifyMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' {
  if (buffer.length < 12) {
    throw new AppError('IMAGE_INVALID');
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  throw new AppError('IMAGE_INVALID');
}

export async function processUploadImage(
  inputBuffer: Buffer,
  maxSide = 896,
  maxBytes = 10 * 1024 * 1024
): Promise<ProcessedImage> {
  if (inputBuffer.length > maxBytes) {
    throw new AppError('IMAGE_TOO_LARGE', { message: 'Image exceeds the maximum allowed size of 10 MB.' });
  }

  // Magic bytes check
  verifyMagicBytes(inputBuffer);

  let metadata: Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch {
    throw new AppError('IMAGE_INVALID');
  }

  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;
  const longest = Math.max(origWidth, origHeight);

  if (longest < 224) {
    throw new AppError('IMAGE_TOO_SMALL', {
      message: `Image resolution is too small (${origWidth}x${origHeight}px). Longest side must be at least 224px.`,
      details: { width: origWidth, height: origHeight },
    });
  }

  try {
    const pipeline = sharp(inputBuffer)
      .rotate()
      .resize({
        width: maxSide,
        height: maxSide,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 });

    const buffer = await pipeline.toBuffer();
    const finalMeta = await sharp(buffer).metadata();

    return {
      buffer,
      base64: buffer.toString('base64'),
      width: finalMeta.width || origWidth,
      height: finalMeta.height || origHeight,
    };
  } catch (err) {
    throw new AppError('INTERNAL', { message: `Image processing error: ${(err as Error).message}` });
  }
}
