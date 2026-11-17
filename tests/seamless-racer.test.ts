// @ts-nocheck — Node asset verification runs in Vitest; app TS target has no @types/node.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const variants = {
  mobile: {
    file: "seamless-mobile.glb",
    sha256: "f61e1a87ac61c954f8afd9e182d4ecc9ff3138af9b36a4c6eb73cc273794bad1",
  },
  full: {
    file: "seamless-full.glb",
    sha256: "bd35beb515859628056e9ef7c024f626e2b7580f09fb1d46a4439fb34a9a48a9",
  },
} as const;

function gltf(file: string) {
  const data = readFileSync(resolve("public/assets/racer", file));
  expect(data.toString("ascii", 0, 4)).toBe("glTF");
  expect(data.readUInt32LE(4)).toBe(2);
  expect(data.readUInt32LE(8)).toBe(data.byteLength);
  const jsonLength = data.readUInt32LE(12);
  const json = JSON.parse(data.toString("utf8", 20, 20 + jsonLength));
  return { data, json };
}

describe("user-supplied seamless Super-G racer originals", () => {
  for (const [quality, variant] of Object.entries(variants)) {
    it("keeps the authentic " + quality + " body, 25 bones and animation clips", () => {
      const { data, json: g } = gltf(variant.file);
      expect(createHash("sha256").update(data).digest("hex")).toBe(variant.sha256);
      const names = g.nodes.map((n: {name?:string}) => n.name);
      expect(names).toContain("ONE seamless fused skinned athlete body");
      expect(g.skins).toHaveLength(1);
      const bones = g.skins[0].joints.map((id: number) => names[id]);
      expect(bones).toHaveLength(25);
      for (const name of ["Hips", "Spine", "Chest", "LeftHand", "RightHand",
        "LeftLeg", "RightLeg", "LeftAnkle", "RightAnkle", "LeftFoot", "RightFoot"])
        expect(bones).toContain(name);
      const body = g.nodes.find((n: {name?:string}) =>
        n.name === "ONE seamless fused skinned athlete body");
      expect(body.skin).toBe(0);
      const attributes = g.meshes[body.mesh].primitives[0].attributes;
      for (const name of ["POSITION", "NORMAL", "COLOR_0", "JOINTS_0", "WEIGHTS_0"])
        expect(attributes).toHaveProperty(name);
      expect(g.animations.map((a: {name:string}) => a.name)).toEqual([
        "SG_START_PUSH", "SG_AERO_TUCK", "SG_CARVE_LEFT",
        "SG_CARVE_RIGHT", "SG_COMPRESSION", "SG_AIR",
        "SG_LANDING", "SG_FINISH", "SG_GATE_IMPACT",
      ]);
      // Both detailed skis and race boots follow real foot bones rather
      // than being static scene decoration or duplicate generated meshes.
      for (const [foot, side] of [["LeftFoot", "LEFTFOOT"], ["RightFoot", "RIGHTFOOT"]]) {
        const footNode = g.nodes.find((n: {name?:string}) => n.name === foot);
        expect(footNode.children.some((id: number) =>
          g.nodes[id].name?.startsWith(side + "/Top glossy curved topsheet"))).toBe(true);
      }
    });
  }
});
