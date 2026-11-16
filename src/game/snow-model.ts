import type { SnowSurface } from "./surface";

export type SnowKind = "ice" | "hardpack" | "groomed" | "fresh" | "powder";

export function classifySnow(s: SnowSurface): SnowKind {
  if (s.depth > 0.55) return "powder";
  if (s.depth > 0.25) return "fresh";
  if (s.ice > 0.38) return "ice";
  if (s.packed > 0.65) return "hardpack";
  return "groomed";
}

const LABELS: Record<SnowKind, string> = {
  ice: "NEIGE TRÈS DURE",
  hardpack: "NEIGE COMPACTÉE",
  groomed: "NEIGE DAMÉE",
  fresh: "NEIGE FRAÎCHE",
  powder: "POUDREUSE",
};

export const snowLabel = (s: SnowSurface): string =>
  LABELS[classifySnow(s)];
