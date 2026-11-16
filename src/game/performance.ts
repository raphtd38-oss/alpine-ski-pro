/**
 * Adaptive render resolution with hysteresis. The browser remains free to
 * present as many frames as its refresh rate/GPU permit; no FPS cap exists.
 * Physics time steps are completely independent of these visual decisions.
 */
export interface PerformanceTuning {
  ratio: number;
  shadowScale: number;
}
export class AdaptiveQuality {
  ratio: number;
  shadowScale = 1;
  private smoothedFrameMs = 1000 / 60;
  private sampleSeconds = 0;
  private stableSeconds = 0;

  constructor(
    public readonly maxRatio: number,
    public readonly minRatio: number,
  ) {
    this.ratio = maxRatio;
  }

  /** Returns changes only after sustained load; inactive/hidden frames are ignored. */
  sample(frameSeconds: number, enabled = true): PerformanceTuning | null {
    if (!enabled || !Number.isFinite(frameSeconds) || frameSeconds <= 0 || frameSeconds > 0.12) {
      this.sampleSeconds = 0;
      this.stableSeconds = 0;
      return null;
    }
    this.smoothedFrameMs += (frameSeconds * 1000 - this.smoothedFrameMs) *
      Math.min(1, frameSeconds * 3);
    this.sampleSeconds += frameSeconds;
    if (this.sampleSeconds < 2) return null;
    const interval = this.sampleSeconds;
    this.sampleSeconds = 0;
    const fps = 1000 / this.smoothedFrameMs;
    const oldRatio = this.ratio;
    const oldShadows = this.shadowScale;

    if (fps < 52) {
      this.stableSeconds = 0;
      if (this.ratio > this.minRatio + 0.009) {
        this.ratio = Math.max(this.minRatio, this.ratio - (fps < 38 ? 0.16 : 0.09));
      } else if (fps < 48) {
        // Keep real shadows and character/detail meshes: simplify only the
        // costly shadow-map resolution after pixel scaling is exhausted.
        this.shadowScale = 0.5;
      }
    } else if (fps >= 57) {
      this.stableSeconds += interval;
      const fast = fps >= 72;
      if (fast || this.stableSeconds >= 10) {
        // Recover image quality conservatively to avoid 60 Hz oscillation.
        this.stableSeconds = 0;
        if (this.shadowScale < 1) this.shadowScale = 1;
        else this.ratio = Math.min(this.maxRatio, this.ratio + (fast ? 0.08 : 0.035));
      }
    } else {
      this.stableSeconds = 0;
    }

    if (this.ratio === oldRatio && this.shadowScale === oldShadows) return null;
    this.ratio = Math.round(this.ratio * 1000) / 1000;
    return { ratio: this.ratio, shadowScale: this.shadowScale };
  }
}
