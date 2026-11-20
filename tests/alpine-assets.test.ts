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

  it("has a bounded scenery download and separate snow and rock PBR sources", () => {
    expect(pack.models.reduce((n, m) => n + m.bytes, 0)).toBeLessThan(1_500_000);
    expect(pack.textures.map((t) => t.key).sort()).toEqual(
      ["rock-arm", "rock-diffuse", "rock-normal", "snow-diffuse", "snow-normal", "snow-roughness"],
    );
    for (const texture of pack.textures) {
      expect(texture.url).toMatch(/^https:\/\/dl\.polyhaven\.org\//);
      expect(texture.url).toContain(texture.key.startsWith("snow-") ? "/1k/snow_02/" : "/1k/rock_face_03/");
    }
    const rocks = pack.textures.filter(t => t.key.startsWith("rock-"));
    expect(rocks.reduce((sum, t) => sum + (t.bytes ?? 0), 0)).toBeLessThan(3_000_000);
    for (const texture of rocks) {
      expect(texture.source).toBe("https://polyhaven.com/a/rock_face_03");
      expect(texture.license).toBe("CC0-1.0");
      expect(texture.md5).toMatch(/^[0-9a-f]{32}$/);
      expect(texture.author).toContain("Dario Barresi");
    }
  });
});
