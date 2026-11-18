import { describe, expect, it } from "vitest";
import {
  BROADCAST_STATIONS, planSuperGBroadcastShot, broadcastFlightFraming,
} from "../src/render/superg-broadcast-shot";
import { superGVideoSpeedTuck } from "../src/render/superg-carve-kinematics";
import { COURSES } from "../src/game/course";

describe("82 s Olympic television reference: video-grounded SG visual staging", () => {
  it("gives nine distinct TV camera cuts across the existing Cortina course", () => {
    expect(BROADCAST_STATIONS[0]).toBe(0);
    expect(BROADCAST_STATIONS.at(-1)).toBe(2105);
    const ids = BROADCAST_STATIONS.slice(0,-1).map(z=>planSuperGBroadcastShot(z + 2, 32).id);
    expect(new Set(ids).size).toBe(9);
    expect(COURSES.SG.gates.length).toBe(34); // do not substitute Bormio's gate positions
  });
  it("holds the racer in view through edge transitions, fast straights and flight", () => {
    for (const speed of [0,10,25,34,50,NaN]) {
      for (const z of [-40, 0, 198, 250, 800, 1500, 2104, 3000, NaN]) {
        const shot = planSuperGBroadcastShot(z,speed);
        expect(Number.isFinite(shot.lateralM)).toBe(true);
        expect(shot.lateralM).toBeGreaterThan(18);
        expect(shot.lateralM).toBeLessThan(50);
        expect(shot.heightAboveGroundM).toBeGreaterThan(8);
        expect(shot.fovDeg).toBeGreaterThan(28);
        expect(shot.fovDeg).toBeLessThan(48);
      }
    }
    const normal = planSuperGBroadcastShot(315,31);
    const jump = broadcastFlightFraming(normal,1.4,0);
    expect(jump.fovDeg).toBeGreaterThan(normal.fovDeg);
    expect(jump.lateralM).toBeGreaterThan(normal.lateralM);
    expect(jump.heightAboveGroundM).toBeGreaterThan(normal.heightAboveGroundM);
  });
  it("models natural video-speed tuck without hiding strong carves or jumps", () => {
    const upright = superGVideoSpeedTuck(12,0,0,0);
    const straight = superGVideoSpeedTuck(35,0,0,0);
    const carved = superGVideoSpeedTuck(35,1,0,0);
    const air = superGVideoSpeedTuck(35,0,1,0);
    const landing = superGVideoSpeedTuck(35,0,0,1);
    expect(upright).toBe(0);
    expect(straight).toBeGreaterThan(0.65);
    expect(carved).toBeLessThan(straight/2);
    expect(air).toBeLessThan(straight/3);
    expect(landing).toBeLessThan(straight/2);
    expect(superGVideoSpeedTuck(NaN,NaN,NaN,NaN)).toBe(0);
  });
});
