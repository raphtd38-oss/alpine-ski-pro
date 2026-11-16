import * as pc from "playcanvas";
import type { Course, Equipment, Frame } from "../game/types";
import { terrainHeight, gradient } from "../game/course";
import { shape, material, meshEntity } from "./geometry";
export class Athlete {
  root = new pc.Entity("Skier");
  rig: pc.Entity;
  joints: Record<string, pc.GraphNode> = {};
  skis: pc.Entity[] = [];
  skiSurfaces: { mesh: pc.Mesh; base: number[] }[] = [];
  poles: pc.Entity[] = [];
  visualEdge = 0;
  visualCrouch = 0.045;
  lastTurnSide = 0;
  plantingSide = 0;
  plantEnergy = 0;
  material: pc.StandardMaterial;
  ownedMaterials: pc.StandardMaterial[] = [];
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
    this.ownedMaterials.push(this.material, base);
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
      const surface = meshEntity(
        app.graphicsDevice,
        e,
        "Shaped ski with raised tip",
        p,
        indices,
        m,
      );
      this.skiSurfaces.push({
        mesh: surface.render!.meshInstances[0].mesh!,
        base: [...p],
      });
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
    // Lightweight original detail meshes make the silhouette and equipment
    // readable up close. They follow existing GLB bones, not a separate rig.
    const visor = material("Goggle anti-reflective visor", "#263b4d", 0.65, 0.88);
    const trim = material("Helmet air vents and carbon buckles", "#122432", 0.4, 0.55);
    const highlight = material("Equipment safety highlight", "#aee5e1", 0.25, 0.6);
    this.ownedMaterials.push(visor, trim, highlight);
    const head = this.rig.findByName("Head") as pc.Entity | null;
    if (head) {
      shape(head, "box", "Goggle lens highlight",
        [0, 0.031, 0.146], [0.19, 0.038, 0.015], visor);
      for (const side of [-1, 1]) {
        shape(head, "box", "Helmet side vents",
          [side * 0.088, 0.157, -0.025], [0.029, 0.009, 0.083], trim);
        shape(head, "box", "Goggle secure strap",
          [side * 0.131, -0.005, -0.018], [0.018, 0.03, 0.15], trim);
      }
    }
    for (const side of ["L", "R"]) {
      const ankle = this.rig.findByName(side + "Ankle") as pc.Entity | null;
      if (!ankle) continue;
      for (const y of [-0.012, 0.052]) {
        shape(ankle, "box", "Racing boot micro buckle",
          [0, y, 0.168], [0.116, 0.018, 0.026], trim);
        shape(ankle, "box", "Boot clasp",
          [0.037, y, 0.182], [0.028, 0.014, 0.014], highlight);
      }
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
          this.ownedMaterials.push(mat);
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
    // Blend the athlete between turns in rendering time, independently of
    // the deterministic 120 Hz physics. Fast turn transitions stay readable
    // without the "rigid mannequin snaps sideways" appearance.
    const blend = 1 - Math.exp(-Math.max(0, Math.min(0.1, dt)) * 12);
    const edgeTarget = Math.max(-1.1, Math.min(1.1, f.edge));
    this.visualEdge += (edgeTarget - this.visualEdge) * blend;
    const edge = this.visualEdge;
    // Initiate a brief pole plant at each completed edge transition.
    const side = edge > 0.17 ? 1 : edge < -0.17 ? -1 : 0;
    if (side !== 0 && this.lastTurnSide !== 0 && side !== this.lastTurnSide) {
      this.plantingSide = side;
      this.plantEnergy = 1;
    }
    if (side !== 0) this.lastTurnSide = side;
    this.plantEnergy *= Math.exp(-Math.max(0, dt) * 7);
    const load = Math.max(0, Math.min(1.4, f.flex ?? 0));
    const crouchTarget = 0.055 + f.tuck * 0.18 +
      Math.abs(edge) * 0.085 + load * 0.045;
    this.visualCrouch += (crouchTarget - this.visualCrouch) * blend;
    const crouch = this.visualCrouch;
    const j = this.joints;
    const lean = edge * (0.14 + load * 0.04);
    j.Pelvis?.setLocalPosition(lean, 0.92 - crouch, -0.055 * f.tuck);
    j.Spine?.setLocalEulerAngles(10 + f.tuck * 27, edge * -3, -edge * 19);
    j.Chest?.setLocalEulerAngles(5 + f.tuck * 12, -edge * 11, edge * 12);
    j.Head?.setLocalEulerAngles(-12 - f.tuck * 23, edge * 7, edge * 3);
    j.Pelvis?.setLocalEulerAngles(0, 0, -edge * 19);
    // Analytic sagittal two-link IK. Flexion follows COM height and outside-leg loading.
    for (const [i, side] of ["L", "R"].entries()) {
      const outside = (i === 0 ? 1 : -1) * edge;
      const hipY = 0.9 - crouch + outside * 0.035;
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
      j[side + "Hip"]?.setLocalEulerAngles(hipRot, 0, edge * 12);
      j[side + "Knee"]?.setLocalEulerAngles(kneeRot, 0, 0);
      j[side + "Ankle"]?.setLocalEulerAngles(-hipRot - kneeRot, 0, -edge * 10);
      const activePlant = ((i === 0 ? 1 : -1) === this.plantingSide)
        ? this.plantEnergy : 0;
      j[side + "Shoulder"]?.setLocalEulerAngles(
        -f.tuck * 15 + Math.sin(f.t * 3 + i) * Math.abs(edge) * 4 -
          activePlant * 23,
        0,
        (i === 0 ? -1 : 1) * (8 + Math.abs(edge) * 12),
      );
      j[side + "Elbow"]?.setLocalEulerAngles(
        -f.tuck * 36 - activePlant * 15, 0, 0);
      const surf = this.skiSurfaces[i];
      const vertices = [...surf.base];
      for (let k = 0; k < vertices.length; k += 3) {
        const t = (vertices[k + 2] / this.equipment.length) * 2;
        vertices[k + 1] -=
          (f.flex ?? 0) * 0.018 * (1 - t * t) * (1 + outside * 0.35);
      }
      surf.mesh.setPositions(vertices);
      surf.mesh.update();
      this.skis[i].setLocalEulerAngles(0, outside * 1.2, -edge * 45);
      this.skis[i].setLocalPosition(
        (i === 0 ? -1 : 1) * (0.16 + Math.abs(edge) * 0.035),
        Math.abs(outside) * 0.012,
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
        const activePlant = ((i === 0 ? 1 : -1) === this.plantingSide)
          ? this.plantEnergy : 0;
        this.poles[i].setLocalEulerAngles(
          27 - f.tuck * 12 - activePlant * 28,
          0,
          (i === 0 ? -1 : 1) * (9 + activePlant * 7),
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
    this.ownedMaterials.forEach((m) => m.destroy());
  }
}
