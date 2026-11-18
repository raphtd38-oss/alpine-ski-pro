/** Original Cortina sky palettes. Geometry and image references are illustrative,
 * not an astronomical or meteorological reconstruction of 12 February 2026.
 * Olympic daylight is default; previous pink sunset remains via ?lighting=sunset.
 */
export type CortinaLightMode = "daylight" | "sunset";
export const cortinaLightingMode = (query: string): CortinaLightMode => {
  try { return new URLSearchParams(query).get("lighting") === "sunset" ? "sunset" : "daylight"; }
  catch { return "daylight"; }
};
type SkyStop = { y: number; rgb: readonly [number,number,number] };
export const DAYLIGHT_RAMP: readonly SkyStop[] = [
  { y: -1, rgb: [.62,.76,.87] },
  { y: -.16, rgb: [.68,.81,.90] },
  { y: .02, rgb: [.64,.78,.88] },
  { y: .17, rgb: [.47,.69,.86] },
  { y: .48, rgb: [.23,.49,.76] },
  { y: 1, rgb: [.06,.27,.55] },
];
export const SUNSET_RAMP: readonly SkyStop[] = [
  { y: -1, rgb: [.43,.38,.48] },
  { y: -.16, rgb: [.79,.50,.51] },
  { y: .02, rgb: [.99,.61,.43] },
  { y: .17, rgb: [.91,.56,.55] },
  { y: .48, rgb: [.53,.47,.67] },
  { y: 1, rgb: [.21,.34,.58] },
];
export function cortinaSkyRGB(height: number, mode: CortinaLightMode): [number,number,number] {
  const ramp = mode === "sunset" ? SUNSET_RAMP : DAYLIGHT_RAMP;
  const safe = Number.isFinite(height) ? height : 0;
  for (let i=1;i<ramp.length;i++) {
    const a = ramp[i-1],b = ramp[i];
    if (safe <= b.y) {
      const t = Math.max(0,Math.min(1,(safe-a.y)/(b.y-a.y)));
      const smooth = t*t*(3-2*t);
      return [
        a.rgb[0] + (b.rgb[0]-a.rgb[0])*smooth,
        a.rgb[1] + (b.rgb[1]-a.rgb[1])*smooth,
        a.rgb[2] + (b.rgb[2]-a.rgb[2])*smooth,
      ];
    }
  }
  return [...ramp[ramp.length-1].rgb];
}
export const cortinaHorizonHex = (mode: CortinaLightMode): string =>
  mode === "sunset" ? "#dfadbb" : "#8cb9d9";
