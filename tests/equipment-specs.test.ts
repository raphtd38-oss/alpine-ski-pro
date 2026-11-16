import { describe, expect, it } from "vitest";
import { PRO_POLE, PRO_GEAR } from "../src/render/equipment-specs";

describe("professional SL skier equipment scale", () => {
  it("uses realistic pole baskets rather than metre-sized spheres", () => {
    expect(PRO_POLE.basketDiameter).toBeGreaterThan(0.075);
    expect(PRO_POLE.basketDiameter).toBeLessThan(0.20);
    expect(PRO_POLE.basketThickness).toBeLessThan(0.03);
  });
  it("keeps tips, pole grips and hand guards proportional to the shaft", () => {
    expect(PRO_POLE.shaftLength).toBeGreaterThan(0.85);
    expect(PRO_POLE.shaftLength).toBeLessThan(1.4);
    expect(PRO_POLE.gripLength).toBeLessThan(PRO_POLE.shaftLength / 4);
    expect(PRO_POLE.ferruleLength).toBeLessThan(0.10);
    expect(PRO_GEAR.gloveGuardWidth).toBeLessThan(0.17);
  });
});
