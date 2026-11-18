import { angleDiff, type Frame, type SkiContactTelemetry } from './types';

const channels = ['edgeLeft', 'edgeRight', 'skiYawLeft', 'skiYawRight',
  'normalForceLeft', 'normalForceRight', 'yawRate', 'suspension',
  'suspensionVelocity', 'normalAcceleration', 'turnRadius'] as const;

/** Same optional channels for live frames and saved replays. Old frames must
 * retain undefined, so the pose solver can distinguish missing measurements. */
export function skiTelemetry(s: Partial<SkiContactTelemetry>): Partial<SkiContactTelemetry> {
  return Object.fromEntries(channels.map(key => [key, s[key]]));
}
export function interpolateSkiTelemetry(a: Frame, b: Frame, u: number): Partial<SkiContactTelemetry> {
  return Object.fromEntries(channels.map(key => {
    const start = a[key] ?? b[key], end = b[key] ?? a[key];
    if (start === undefined || end === undefined) return [key, undefined];
    const delta = key === 'skiYawLeft' || key === 'skiYawRight'
      ? angleDiff(end, start) : end - start;
    return [key, start + delta * u];
  }));
}
