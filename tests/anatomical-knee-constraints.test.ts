import { describe, expect, it } from "vitest";
import * as pc from "playcanvas";
import { solve25BoneLegKnee } from "../src/render/superg-race-pose-director";

describe("anatomical knee constraints", () => {
  for (const side of ["L", "R"] as const) {
    it(`preserves both segment lengths even when knee pole is parallel to the target (${side})`, () => {
      const hip = new pc.Vec3(.12, .08, -.03);
      const femur = new pc.Vec3(0, -.46, 0);
      const tibia = new pc.Vec3(0, -.43, 0);
      const axis = new pc.Vec3(side === "L" ? -.08 : .08, -.22, -1).normalize();
      for (const offset of [-.00001, 0, .00001]) {
        const target = hip.clone().add(axis.clone().mulScalar(.65)).add(new pc.Vec3(offset,0,0));
        const sol = solve25BoneLegKnee(hip, femur, tibia, target, side);
        expect(sol.kneePelvis.distance(hip)).toBeCloseTo(femur.length(), 6);
        expect(sol.anklePelvis.distance(sol.kneePelvis)).toBeCloseTo(tibia.length(), 6);
        expect(sol.targetErrorM).toBeLessThan(1e-6);
      }
    });
    it(`preserves segment lengths when the target is outside the reachable region (${side})`, () => {
      const hip = new pc.Vec3();
      const femur = new pc.Vec3(0, -.46, 0);
      const tibia = new pc.Vec3(0, -.43, 0);
      for (const target of [new pc.Vec3(), new pc.Vec3(.3,-2,.3), new pc.Vec3(.001,-.001,0)]) {
        const sol = solve25BoneLegKnee(hip, femur, tibia, target, side);
        const a = sol.kneePelvis.clone().sub(hip);
        const b = sol.anklePelvis.clone().sub(sol.kneePelvis);
        const angle = Math.acos(Math.max(-1,Math.min(1,a.clone().normalize().dot(b.clone().normalize()))))*180/Math.PI;
        expect(a.length()).toBeCloseTo(femur.length(),6);
        expect(b.length()).toBeCloseTo(tibia.length(),6);
        expect(angle).toBeGreaterThanOrEqual(7.999);
        expect(angle).toBeLessThanOrEqual(145.001);
        expect(sol.targetErrorM).toBeGreaterThan(0);
      }
    });
  }
});
