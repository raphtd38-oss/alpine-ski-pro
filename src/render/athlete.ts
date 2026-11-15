import * as pc from "playcanvas";
import type { Course, Equipment, Frame } from "../game/types";
import { terrainHeight, gradient } from "../game/course";
import { shape, material, meshEntity } from "./geometry";
export class Athlete {
  root = new pc.Entity("Skier");
  rig: pc.Entity;
  joints: Record<string, pc.GraphNode> = {};
  skis: pc.Entity[] = [];
  poles: pc.Entity[] = [];
  material: pc.StandardMaterial;
  constructor(
    public app: pc.Application,
    asset: pc.Asset,
    public equipment: Equipment,
    ghost = false,
  ) {
    app.root.addChild(this.root);
    this.rig = (
      asset.resource as pc.ContainerResource
    ).instantiateRenderEntity();
    this.root.addChild(this.rig);
    for (const name of [
      "Pelvis",
      "Spine",
      "Chest",
      "Neck",
      "Head",
      "LHip",
      "LKnee",
      "LAnkle",
      "RHip",
      "RKnee",
      "RAnkle",
      "LShoulder",
      "LElbow",
      "LWrist",
      "RShoulder",
      "RElbow",
      "RWrist",
    ]) {
      const n = this.rig.findByName(name);
      if (n) this.joints[name] = n;
    }
    this.material = material(
      ghost ? "Ghost cyan" : "Ski topsheet",
      ghost ? "#59e9ec" : "#f06340",
      0.35,
      0.65,
    );
    const base = material("Ski graphite", "#102736", 0.45, 0.6);
    for (const side of [-1, 1]) {
      const e = new pc.Entity("Independent ski");
      this.root.addChild(e);
      this.skis.push(e);
      const p: number[] = [],
        indices: number[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          z = (t - 0.5) * equipment.length;
        const w = 0.047 + 0.014 * Math.pow(t * 2 - 1, 2);
        const y = 0.045 + Math.pow(Math.max(0, t - 0.8) / 0.2, 2) * 0.13;
        for (const x of [-w, w]) p.push(x, y, z);
      }
      for (let i = 0; i < n; i++) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      const m = this.material;
      m.cull = pc.CULLFACE_NONE;
      m.update();
      meshEntity(
        app.graphicsDevice,
        e,
        "Shaped ski with raised tip",
        p,
        indices,
        m,
      );
      shape(
        e,
        "box",
        "Binding heel",
        [0, 0.1, -0.12],
        [0.085, 0.095, 0.14],
        base,
      );
      shape(e, "box", "Binding toe", [0, 0.1, 0.15], [0.09, 0.07, 0.1], base);
      e.setLocalPosition(side * 0.16, 0, 0.02);
      const pole = shape(
        this.root,
        "cylinder",
        "Carbon ski pole",
        [side * 0.38, 0.5, 0.05],
        [0.018, 1.02, 0.018],
        base,
      );
      this.poles.push(pole);
      shape(pole, "sphere", "Pole basket", [0, -0.46, 0], [3, 0.05, 3], base);
    }
    if (ghost) {
      this.rig.findComponents("render").forEach((c) => {
        const r = c as pc.RenderComponent;
        r.castShadows = false;
        r.meshInstances.forEach((mi) => {
          mi.material = this.material;
        });
      });
      this.material.opacity = 0.28;
      this.material.blendType = pc.BLEND_NORMAL;
      this.material.depthWrite = false;
      this.material.update();
    }
  }
  paint(hex: string) {
    for (const c of this.rig.findComponents("render")) {
      for (const mi of (c as pc.RenderComponent).meshInstances) {
        if (mi.material?.name.startsWith("Race suit")) {
          const mat = mi.material.clone() as pc.StandardMaterial;
          mat.diffuse.fromString(hex);
          mat.update();
          mi.material = mat;
        }
      }
    }
  }
  update(f: Frame, c: Course, dt: number) {
    const y = terrainHeight(f.x, f.z, c) + f.height;
    this.root.setPosition(f.x, y + 0.015, f.z);
    const [, grade] = gradient(f.x, f.z, c);
    this.root.setEulerAngles(
      (-Math.atan(grade) * 180) / Math.PI,
      (f.heading * 180) / Math.PI,
      0,
    );
    const j = this.joints,
      crouch = 0.045 + f.tuck * 0.18 + Math.abs(f.edge) * 0.07,
      lean = f.edge * 0.12;
    j.Pelvis?.setLocalPosition(lean, 0.92 - crouch, -0.055 * f.tuck);
    j.Spine?.setLocalEulerAngles(10 + f.tuck * 27, 0, -f.edge * 15);
    j.Chest?.setLocalEulerAngles(5 + f.tuck * 12, -f.edge * 9, f.edge * 8);
    j.Head?.setLocalEulerAngles(-12 - f.tuck * 23, f.edge * 7, 0);
    j.Pelvis?.setLocalEulerAngles(0, 0, -f.edge * 16);
    // Analytic sagittal two-link IK. Flexion follows COM height and outside-leg loading.
    for (const [i, side] of ["L", "R"].entries()) {
      const load = (i === 0 ? 1 : -1) * f.edge;
      const hipY = 0.9 - crouch + load * 0.035;
      const dy = Math.min(0.81, hipY - 0.12),
        dz = 0.02 + f.tuck * 0.055,
        L1 = 0.421,
        L2 = 0.396;
      const d = Math.sqrt(dy * dy + dz * dz),
        alpha = Math.acos(
          Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))),
        );
      const dir = Math.atan2(dz, dy),
        thigh = dir + alpha,
        kneeZ = Math.sin(thigh) * L1,
        kneeY = -Math.cos(thigh) * L1;
      const calf = Math.atan2(dz - kneeZ, dy + kneeY);
      const hipRot = (-(thigh - Math.atan2(0.13, 0.4)) * 180) / Math.PI;
      const kneeRot =
        (-(calf - Math.atan2(-0.11, 0.38)) * 180) / Math.PI - hipRot;
      j[side + "Hip"]?.setLocalEulerAngles(hipRot, 0, f.edge * 9);
      j[side + "Knee"]?.setLocalEulerAngles(kneeRot, 0, 0);
      j[side + "Ankle"]?.setLocalEulerAngles(-hipRot - kneeRot, 0, -f.edge * 8);
      j[side + "Shoulder"]?.setLocalEulerAngles(
        -f.tuck * 15 + Math.sin(f.t * 3 + i) * Math.abs(f.edge) * 4,
        0,
        (i === 0 ? -1 : 1) * (8 + Math.abs(f.edge) * 9),
      );
      j[side + "Elbow"]?.setLocalEulerAngles(-f.tuck * 36, 0, 0);
      this.skis[i].setLocalEulerAngles(0, load * 1.2, -f.edge * 43);
      this.skis[i].setLocalPosition(
        (i === 0 ? -1 : 1) * (0.16 + Math.abs(f.edge) * 0.035),
        Math.abs(load) * 0.012,
        0.02,
      );
      const wrist = j[side + "Wrist"];
      if (wrist) {
        const point = this.root
          .getWorldTransform()
          .clone()
          .invert()
          .transformPoint(wrist.getPosition());
        this.poles[i].setLocalPosition(point.x, point.y - 0.45, point.z - 0.24);
        this.poles[i].setLocalEulerAngles(
          27 - f.tuck * 12,
          0,
          (i === 0 ? -1 : 1) * 9,
        );
      }
    }
    if (f.fallen > 0) {
      this.rig.setLocalEulerAngles(0, 0, 76);
      this.rig.setLocalPosition(0, 0.15, 0);
    } else {
      this.rig.setLocalEulerAngles(0, 0, 0);
      this.rig.setLocalPosition(0, 0, 0);
    }
  }
  destroy() {
    this.root.destroy();
    this.material.destroy();
  }
}
