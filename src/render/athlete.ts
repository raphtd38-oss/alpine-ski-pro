import * as pc from "playcanvas";
import type { Course, Equipment, Frame } from "../game/types";
import { terrainHeight, gradient } from "../game/course";
import { shape, material, meshEntity } from "./geometry";
import { PRO_POLE, PRO_GEAR } from "./equipment-specs";
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
  visualFall = 0;
  visualUpperBody = 0;
  visualPressure = 0.5;
  visualChatter = 0;
  visualImpact = 0;
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
    const poleGrip = material("Professional pole grips", "#202b34", 0.04, 0.5);
    const poleFerrule = material("Steel carbide pole tip", "#cad4d8", 0.65, 0.75);
    const handGuard = material("Slalom hand protection", "#f0f5f5", 0.18, 0.53);
    this.ownedMaterials.push(this.material, base, poleGrip, poleFerrule, handGuard);
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
        [PRO_POLE.shaftDiameter, PRO_POLE.shaftLength, PRO_POLE.shaftDiameter],
        base,
      );
      this.poles.push(pole);
      // Competition SL poles: a narrow basket near the tip, an ergonomic
      // handgrip and a small protective guard. No metre-wide geometry.
      shape(
        pole, "cylinder", "Real-scale pole basket",
        [0, -PRO_POLE.shaftLength / 2 + 0.06, 0],
        [PRO_POLE.basketDiameter, PRO_POLE.basketThickness, PRO_POLE.basketDiameter],
        base,
      );
      shape(
        pole, "cylinder", "Carbide ski pole tip",
        [0, -PRO_POLE.shaftLength / 2 - PRO_POLE.ferruleLength * 0.25, 0],
        [0.009, PRO_POLE.ferruleLength, 0.009],
        poleFerrule,
      );
      shape(
        pole, "cylinder", "Rubber pole grip",
        [0, PRO_POLE.shaftLength / 2 - PRO_POLE.gripLength / 2, 0],
        [PRO_POLE.gripDiameter, PRO_POLE.gripLength, PRO_POLE.gripDiameter],
        poleGrip,
      );
      shape(
        pole, "box", "Slalom race hand protector",
        [side * 0.055, PRO_POLE.shaftLength / 2 - 0.07, 0.015],
        [PRO_GEAR.gloveGuardWidth, PRO_GEAR.gloveGuardHeight, 0.025],
        handGuard,
      );
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
        // Preserve the graphite compression side panels and the white bib.
        // Only recolour the base fabric; pro racewear needs multiple materials.
        if (
          mi.material?.name.startsWith("Race suit / alpine crimson") ||
          mi.material?.name.startsWith("Race suit / ember")
        ) {
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
    // Replays generated before V1.5 provide no contact channels: keep their
    // posture and apply only physically grounded data when present.
    const targetPressure = Math.max(0.06, Math.min(0.94,
      f.load ?? (0.5 + edge * 0.42)));
    this.visualPressure += (targetPressure - this.visualPressure) * blend;
    const outsidePressure = Math.abs(this.visualPressure - 0.5) * 2;
    this.visualChatter += (
      Math.max(0, Math.min(1, f.chatter ?? 0)) - this.visualChatter
    ) * blend;
    this.visualImpact += (
      Math.max(0, Math.min(1, f.poleImpact ?? 0)) - this.visualImpact
    ) * blend;
    const shake = this.visualChatter * Math.sin(f.t * 62) * 0.008;
    const torsoTarget = -edge * (9 + load * 5) +
      this.visualImpact * (edge >= 0 ? -9 : 9) -
      Math.sign(edge) * (f.skid ?? 0) * 5;
    this.visualUpperBody += (torsoTarget - this.visualUpperBody) * blend;
    const pressureAbsorption = Math.min(0.065,
      Math.abs((f.pressure ?? 1) - 1) * 0.055);
    const skidStance = Math.min(0.04, (f.skid ?? 0) * 0.04);
    const crouchTarget = 0.055 + f.tuck * 0.18 +
      Math.abs(edge) * 0.085 + load * 0.045 +
      pressureAbsorption + skidStance;
    this.visualCrouch += (crouchTarget - this.visualCrouch) * blend;
    const crouch = this.visualCrouch;
    const j = this.joints;
    // The hips move inside the turn while the shoulders look downhill.
    // The outside leg is visibly longer and keeps the ski pressurized.
    const lean = edge * (0.19 + load * 0.065);
    j.Pelvis?.setLocalPosition(lean + shake, 0.92 - crouch, -0.055 * f.tuck);
    j.Spine?.setLocalEulerAngles(
      10 + f.tuck * 27, edge * -4 + this.visualImpact * 6,
      -edge * (18 + outsidePressure * 8),
    );
    // Stabilize the professional racer's upper body toward the fall line while
    // hips and loaded outside leg continue carving below.
    j.Chest?.setLocalEulerAngles(
      5 + f.tuck * 12 + this.visualImpact * 5,
      this.visualUpperBody, edge * (12 - load * 2) + shake * 90,
    );
    j.Head?.setLocalEulerAngles(
      -12 - f.tuck * 23 + this.visualImpact * 3,
      edge * 7 - this.visualImpact * 3, edge * 3 - shake * 80,
    );
    j.Pelvis?.setLocalEulerAngles(0, edge * 2, -edge * (19 + outsidePressure * 7));
    // Analytic sagittal two-link IK. Flexion follows COM height and outside-leg loading.
    for (const [i, side] of ["L", "R"].entries()) {
      const outside = (i === 0 ? 1 : -1) * edge;
      // The outside leg extends under pressure, the unloaded inside leg
      // retracts slightly. Both ankles remain animated by the existing IK.
      const hipY = 0.9 - crouch + outside * (0.048 + outsidePressure * 0.027);
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
      j[side + "Hip"]?.setLocalEulerAngles(
        hipRot, -outside * 6, edge * (12 + outsidePressure * 5),
      );
      j[side + "Knee"]?.setLocalEulerAngles(
        kneeRot, 0, outside * (3 + outsidePressure * 3),
      );
      j[side + "Ankle"]?.setLocalEulerAngles(
        -hipRot - kneeRot, 0,
        -edge * (10 + outsidePressure * 6) + shake * 150,
      );
      const activePlant = ((i === 0 ? 1 : -1) === this.plantingSide)
        ? this.plantEnergy : 0;
      j[side + "Shoulder"]?.setLocalEulerAngles(
        -f.tuck * 15 + Math.sin(f.t * 3 + i) * Math.abs(edge) * 4 -
          activePlant * 23 - this.visualImpact * 13,
        0,
        (i === 0 ? -1 : 1) * (8 + Math.abs(edge) * 12 +
          (f.skid ?? 0) * 13),
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
      this.skis[i].setLocalEulerAngles(
        outside * (f.skid ?? 0) * 3.5, outside * 1.5,
        -edge * (45 + outsidePressure * 6) + shake * 90,
      );
      this.skis[i].setLocalPosition(
        (i === 0 ? -1 : 1) * (0.16 + Math.abs(edge) * 0.035),
        Math.max(0, -outside) * 0.029 + Math.abs(outside) * 0.008,
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
    // Blend falls and recovery rather than snapping the entire body.
    const desiredFall = f.fallen > 0 ? 1 : 0;
    this.visualFall += (desiredFall - this.visualFall) *
      (1 - Math.exp(-Math.max(0, dt) * 10));
    this.rig.setLocalEulerAngles(0, 0, this.visualFall * 76);
    this.rig.setLocalPosition(0, this.visualFall * 0.15, 0);
  }
  destroy() {
    this.root.destroy();
    this.ownedMaterials.forEach((m) => m.destroy());
  }
}
