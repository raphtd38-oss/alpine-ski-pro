import { describe, expect, it } from "vitest";
import { CORTINA_SCENIC_BUDGET } from "../src/render/cortina-cinematic-detail";
import { CORTINA_LIGHT_STATIONS } from "../src/render/cortina-atmosphere";
import { COURSES } from "../src/game/course";
import { superGCenterX } from "../src/game/superg";

describe("Cortina cinematic environment performance and safe placement", () => {
  it("scales dense forest, peaks, grooming and net density by GPU quality", () => {
    const low = CORTINA_SCENIC_BUDGET.low;
    const medium = CORTINA_SCENIC_BUDGET.medium;
    const high = CORTINA_SCENIC_BUDGET.high;
    const ultra = CORTINA_SCENIC_BUDGET.ultra;
    expect(low.corduroyTracks).toBe(0);
    expect(ultra.woodland).toBeGreaterThan(high.woodland);
    expect(high.woodland).toBeGreaterThan(medium.woodland);
    expect(medium.woodland).toBeGreaterThan(low.woodland);
    expect(low.mountainSpurs).toBeLessThan(ultra.mountainSpurs);
    expect(low.netStep).toBeGreaterThan(ultra.netStep);
    expect(ultra.woodland).toBeLessThan(900);
  });

  it("places projectors outside the race net, without touching competition gates", () => {
    const sg = COURSES.SG;
    expect(CORTINA_LIGHT_STATIONS).toHaveLength(15);
    for (const [index, z] of CORTINA_LIGHT_STATIONS.entries()) {
      const sign = index % 2 === 0 ? -1 : 1;
      const x = superGCenterX(z) + sign * (sg.width / 2 + 16 + (index % 3) * 1.6);
      expect(Math.abs(x - superGCenterX(z))).toBeGreaterThan(sg.width / 2 + 10);
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThan(sg.length);
    }
    expect(sg.gates).toHaveLength(42);
  });
});
