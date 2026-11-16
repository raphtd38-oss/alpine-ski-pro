import { describe, expect, it } from "vitest";
import pack from "../scripts/alpine-pack.json";

describe("licensed alpine world pack", () => {
  it("uses only audited public-domain sources with distinct models", () => {
    expect(pack.license).toBe("CC0-1.0");
    expect(pack.textureLicense).toBe("CC0-1.0");
    expect(pack.source).toMatch(/^https:\/\/3dassets\.dev\/packs\//);
    expect(pack.textureSource).toBe("https://polyhaven.com/a/snow_02");
    expect(pack.models.length).toBeGreaterThanOrEqual(8);
    expect(new Set(pack.models.map((m) => m.key)).size).toBe(pack.models.length);
    for (const model of pack.models) {
      expect(model.id).toBeGreaterThan(0);
      expect(model.bytes).toBeGreaterThan(8000);
      expect(model.bytes).toBeLessThan(1_000_000);
    }
  });

  it("has a bounded scenery download and the three required snow PBR maps", () => {
    expect(pack.models.reduce((n, m) => n + m.bytes, 0)).toBeLessThan(1_500_000);
    expect(pack.textures.map((t) => t.key).sort()).toEqual(
      ["snow-diffuse", "snow-normal", "snow-roughness"],
    );
    for (const texture of pack.textures) {
      expect(texture.url).toMatch(/^https:\/\/dl\.polyhaven\.org\//);
      expect(texture.url).toContain("/1k/snow_02/");
    }
  });
});
