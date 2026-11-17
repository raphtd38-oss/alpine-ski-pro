import { describe, expect, it } from "vitest";
import { graniteTexel } from "../src/render/studio-rock-texel";

describe("Studio Kit granite and slate material", () => {
  it("is deterministic and differs across mountain faces", () => {
    expect(graniteTexel(17, 61)).toEqual(graniteTexel(17, 61));
    expect(graniteTexel(17, 61).diffuse)
      .not.toEqual(graniteTexel(99, 18).diffuse);
  });
  it("gives correctly bounded albedo, normal and roughness maps", () => {
    for (let x = 0; x < 80; x += 7)
      for (let y = 0; y < 80; y += 9) {
        const t = graniteTexel(x,y);
        const all=[...t.diffuse,...t.normal,t.roughness];
        expect(all.every(n=>Number.isFinite(n)&&n>=0&&n<=255)).toBe(true);
        expect(t.normal[2]).toBeGreaterThan(195);
        expect(t.roughness).toBeGreaterThan(165);
      }
  });
});
