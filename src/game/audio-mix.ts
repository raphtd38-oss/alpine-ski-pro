/** Continuous, allocation-free controls for the skiing audio layers.
 * Speed is in metres per second; these are mix gains, not measured decibels.
 * An icy edge sound is triggered by loss of grip, not by a specific weather icon.
 */
export interface SkiSoundMix {
  glide: number;
  carving: number;
  ice: number;
  wind: number;
  filterHz: number;
  windFilterHz: number;
  /** Broadband chatter of edges on frozen snow. */
  rattle: number;
  /** Soft snow hiss from deeper shoulder snow. */
  powder: number;
}
export interface SkiSoundExtra {
  chatter?: number;
  skid?: number;
  depth?: number;
}
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function computeSkiSoundMix(
  speed: number,
  edge: number,
  slip: number,
  active: boolean,
  snowGrip = 1,
  extra: SkiSoundExtra = {},
): SkiSoundMix {
  if (!active) return {
    glide: 0, carving: 0, ice: 0, wind: 0, filterHz: 280,
    windFilterHz: 550, rattle: 0, powder: 0,
  };
  const v = clamp(Number.isFinite(speed) ? speed : 0, 0, 70);
  const e = clamp(Number.isFinite(edge) ? Math.abs(edge) : 0, 0, 1.5);
  const s = clamp(Number.isFinite(slip) ? slip : 0, 0, 30);
  const grip = clamp(Number.isFinite(snowGrip) ? snowGrip : 1, 0.5, 1.3);
  const speedFactor = clamp(v / 10, 0, 1);
  const carving = clamp((e - 0.10) * 1.55, 0, 1) * speedFactor;
  const skid = clamp((s - 0.5) / 6, 0, 1);
  // A pressured, hardpack edge also rasps before the ski fully breaks loose.
  // This is a subtle procedural layer, not a substitute for ElevenLabs audio.
  const brittleEdge = clamp((1.035 - grip) * 3.4, 0, 1) *
    carving * 0.23;
  const ice = clamp(
    skid * speedFactor * clamp((1.3 - grip) / 0.5, 0.1, 1) +
      brittleEdge, 0, 1,
  );
  const safe = (n: number | undefined) =>
    clamp(Number.isFinite(n) ? (n as number) : 0, 0, 1);
  const rattle = safe(extra.chatter) * speedFactor *
    (0.6 + safe(extra.skid) * 0.4);
  const powder = safe(extra.depth) * clamp(v / 18, 0, 1) *
    (0.5 + 0.5 * clamp(e / 0.6, 0, 1));
  return {
    rattle: clamp(rattle * 0.36, 0, 0.36),
    powder: clamp(powder * 0.40, 0, 0.40),
    glide: clamp(v / 40, 0, 0.55),
    carving: clamp(carving * (1 - ice * 0.3) *
      (1 - safe(extra.depth) * 0.6), 0, 0.6),
    ice: clamp(ice * 0.55, 0, 0.55),
    wind: clamp((v - 5) / 36, 0, 0.52),
    filterHz: 250 + v * 35 + s * 75,
    windFilterHz: 430 + v * 30,
  };
}
