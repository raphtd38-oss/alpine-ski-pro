import { describe, expect, it } from "vitest";
import { replayAt, formatTime } from "../src/game/race";
import type { Frame } from "../src/game/types";
const base: Frame = {
  t: 0, x: 0, z: 0, heading: Math.PI - 0.1, edge: 0,
  height: 0, tuck: 0, fallen: 0,
};
describe("smooth slow-motion replay", () => {
  it("crosses the angle wrap via the short arc", () => {
    const a = base, b = { ...a, t: 1, z: 10, heading: -Math.PI + 0.1 };
    const mid = replayAt([a, b], 0.5)!;
    expect(Math.abs(mid.heading)).toBeCloseTo(Math.PI, 7);
    expect(mid.z).toBeCloseTo(5);
  });
  it("interpolates independent ski bending and edge angle at any play speed", () => {
    const a = { ...base, flex: 0 }, b = { ...a, t: 2, z: 20, flex: 1, edge: 0.7 };
    expect(replayAt([a, b], 0.5)?.flex).toBeCloseTo(0.25);
    expect(replayAt([a, b], 1)?.edge).toBeCloseTo(0.35);
  });
  it("formats stable replay timecodes", () => {
    expect(formatTime(75.134)).toBe("01:15.13");
  });
});
