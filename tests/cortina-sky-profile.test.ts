import { describe, expect, it } from "vitest";
import { cortinaLightingMode, cortinaSkyRGB, DAYLIGHT_RAMP, SUNSET_RAMP } from "../src/render/cortina-sky-profile";

describe("Cortina photo-matched olympic daylight, reversible sunset", () => {
  it("uses sunset by default with daylight still available", () => {
    expect(cortinaLightingMode("")).toBe("sunset");
    expect(cortinaLightingMode("?lighting=daylight")).toBe("daylight");
    expect(cortinaLightingMode("?lighting=sunset")).toBe("sunset");
    expect(cortinaLightingMode("?racer=full&lighting=sunset")).toBe("sunset");
  });
  it("keeps a genuine blue sky with gentle horizon and deep zenith", () => {
    expect(DAYLIGHT_RAMP.length).toBe(SUNSET_RAMP.length);
    const noon = cortinaSkyRGB(1,"daylight");
    const dusk = cortinaSkyRGB(1,"sunset");
    expect(noon[2]).toBeGreaterThan(noon[0]);
    expect(noon[2]).toBeGreaterThan(noon[1]);
    expect(dusk).not.toEqual(noon);
    for (const mode of ["sunset","daylight"] as const)
      for (let height=-1;height<=1;height+=.1)
        expect(cortinaSkyRGB(height,mode).every(x=>Number.isFinite(x)&&x>=0&&x<=1)).toBe(true);
  });
});
