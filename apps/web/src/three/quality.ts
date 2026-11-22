export type QualityTier = 'low' | 'standard' | 'high';

export interface QualityConfig {
  tier: QualityTier;
  terrainSegments: number;
  maxPixelRatio: number;
  antialias: boolean;
  maxTriangles: number;
}

export const QUALITY_TIERS: Record<QualityTier, QualityConfig> = {
  low: {
    tier: 'low',
    terrainSegments: 64,
    maxPixelRatio: 1.0,
    antialias: false,
    maxTriangles: 20000,
  },
  standard: {
    tier: 'standard',
    terrainSegments: 128,
    maxPixelRatio: 1.5,
    antialias: true,
    maxTriangles: 60000,
  },
  high: {
    tier: 'high',
    terrainSegments: 192,
    maxPixelRatio: 2.0,
    antialias: true,
    maxTriangles: 120000,
  },
};

export class QualityManager {
  private currentTier: QualityTier = 'standard';
  private frameTimes: number[] = [];
  private lastTime = 0;

  public getConfig(): QualityConfig {
    return QUALITY_TIERS[this.currentTier];
  }

  public setTier(tier: QualityTier) {
    this.currentTier = tier;
  }

  public recordFrame(now: number) {
    if (this.lastTime > 0) {
      const delta = now - this.lastTime;
      this.frameTimes.push(delta);
      if (this.frameTimes.length > 120) {
        this.frameTimes.shift();
      }

      // Check after ~2 seconds (120 frames at 60fps)
      if (this.frameTimes.length === 120 && this.currentTier !== 'low') {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        if (avg > 22) {
          // Drop tier per doc 05 section 5
          this.currentTier = this.currentTier === 'high' ? 'standard' : 'low';
          this.frameTimes = [];
        }
      }
    }
    this.lastTime = now;
  }
}

export const qualityManager = new QualityManager();
