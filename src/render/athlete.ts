import * as pc from "playcanvas";
import type { Course, Equipment, Frame } from "../game/types";
import { terrainHeight, gradient } from "../game/course";
import { shape, material, meshEntity } from "./geometry";
import { PRO_POLE } from "./equipment-specs";
import { SuperGRacePoseDirector, type SGDirectorDiagnostics } from "./superg-race-pose-director";
import { startDrivePhase, startDriveBlend, startPoleContact } from "../game/start-gate";
import {
  superGEdgePose, superGStartBrace, superGLegIK,
  superGSkiFootLift, superGFinishGesture, superGRacerBank,
} from "./superg-video-pose";
export class Athlete {
  root = new pc.Entity("Skier");
  rig: pc.Entity;
  joints: Record<string, pc.GraphNode> = {};
  /** The new 25-bone, one-piece skinned athlete, separate from legacy ghost. */
  isSeamless = false;
  skis: pc.Entity[] = [];
  skiSurfaces: { mesh: pc.Mesh; base: number[] }[] = [];
  poles: pc.Entity[] = [];
  /** Smoother pole-tip contact release between actual SG propulsion strokes. */
  polePlantWeights: number[] = [0, 0];
  visualEdge = 0;
  /** Smoothed render-only bank in degrees; physics remains independent. */
  visualBank = 0;
  visualCrouch = 0.045;
  /** Visual tuck follows controls smoothly; the 120Hz physics stays untouched. */
  visualTuck = 0;
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
  ownedTextures: pc.Texture[] = [];
  /** Connected 25-bone racer owns its own 3D carving solver. Ghost/fallback unchanged. */
  private competitionDirector: SuperGRacePoseDirector | null = null;
  // Isolated visual studio preview: never enabled for normal play.
  private authoredPreview = false;
  private authoredPreviewName = "";
  getAuthoredPreviewName(): string { return this.authoredPreviewName; }
  getAuthoredPreviewSnapshot() {
    if (!this.authoredPreview) return null;
    const names = ["Hips","Spine","Chest","Head","LeftUpLeg","RightUpLeg",
      "LeftLeg","RightLeg","LeftFoot","RightFoot"];
    const joints: Record<string,{localRotation:[number,number,number,number],
      worldPosition:[number,number,number]}> = {};
    for (const name of names) {
      const bone = this.rig.findByName(name);
      if (!bone) continue;
      const q = bone.getLocalRotation(), p = bone.getPosition();
      joints[name] = {
        localRotation: [q.x,q.y,q.z,q.w],
        worldPosition: [p.x,p.y,p.z],
      };
    }
    return {clip:this.authoredPreviewName,joints};
  }
  /** Contact projection of the actual rendered skis, for matching snow trails. */
  getSkiContacts() {
    if (!this.isSeamless) return undefined;
    const contact = (name: string) => {
      const foot = this.rig.findByName(name)!;
      const candidates = [-.046,.046].map(x => foot.getWorldTransform()
        .transformPoint(new pc.Vec3(x,-.125,0)));
      const p = candidates[0].y < candidates[1].y ? candidates[0] : candidates[1];
      return {x:p.x,z:p.z};
    };
    return {left:contact("RightFoot"),right:contact("LeftFoot")};
  }
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
    this.isSeamless = !!this.rig.findByName("ONE seamless fused skinned athlete body") &&
      !!this.rig.findByName("LeftUpLeg") && !!this.rig.findByName("RightFoot");
    if (this.isSeamless) {
      // The donated glTF faces -Z, while the game skis forward along +Z.
      // Rotate the complete skinned hierarchy, without altering game physics.
      this.rig.setLocalEulerAngles(0, 180, 0);
      if (!ghost && new URLSearchParams(location.search).get("motion") === "glb-preview") {
        const resource = asset.resource as pc.ContainerResource;
        const tracks = resource.animations.map((animation) => animation.resource)
          .filter((track): track is pc.AnimTrack => track !== undefined);
        const available = new Set(tracks.map((track) => track.name));
        const wanted = new URLSearchParams(location.search).get("clip") ?? "SG_CARVE_RIGHT";
        if (tracks.length !== 9 || !available.has(wanted)) {
          throw new Error("GLB motion preview unavailable: " + wanted);
        }
        this.rig.addComponent("anim", {activate: true});
        const anim = this.rig.anim;
        if (!anim) throw new Error("GLB preview: Anim component missing");
        for (const track of tracks) anim.assignAnimation(track.name, track);
        const baseLayer = anim.baseLayer;
        if (!baseLayer) throw new Error("GLB preview: no base animation layer");
        baseLayer.play(wanted);
        this.authoredPreview = true;
        this.authoredPreviewName = wanted;
      }
    }
    // Use the actual continuous racer for the primary directional silhouette
    // shadow, instead of 100+ tiny boot/binding shadow draws per cascade.
    // This gives the athlete a legible presence on the snow on desktop and
    // mobile while keeping the linked ski/boot meshes intact.
    if (this.isSeamless && !ghost) {
      for (const component of this.rig.findComponents("render")) {
        const render = component as pc.RenderComponent;
        render.castShadows =
          render.entity.name.includes("ONE seamless fused skinned athlete body");
        render.receiveShadows = true;
      }
    }
    const seamlessBones: Record<string, string> = {
      Pelvis: "Hips", LHip: "LeftUpLeg", LKnee: "LeftLeg",
      LAnkle: "LeftAnkle", LShoulder: "LeftShoulder",
      LUpperArm: "LeftUpperArm",
      LElbow: "LeftForeArm", LWrist: "LeftHand",
      RHip: "RightUpLeg", RKnee: "RightLeg",
      RAnkle: "RightAnkle", RShoulder: "RightShoulder",
      RUpperArm: "RightUpperArm",
      RElbow: "RightForeArm", RWrist: "RightHand",
    };
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
      "LUpperArm",
      "LElbow",
      "LWrist",
      "RShoulder",
      "RUpperArm",
      "RElbow",
      "RWrist",
    ]) {
      const n = this.rig.findByName(this.isSeamless ? (seamlessBones[name] ?? name) : name);
      if (n) this.joints[name] = n;
    }
    this.material = material(
      ghost ? "Ghost cyan" : "Ski topsheet",
      ghost ? "#59e9ec" : "#ffffff",
      0.35,
      0.65,
    );

    if (!ghost) {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      const carbon = ctx.createLinearGradient(0, 0, 128, 0);
      carbon.addColorStop(0, "#071726");
      carbon.addColorStop(0.24, "#183a5c");
      carbon.addColorStop(0.5, "#213e63");
      carbon.addColorStop(0.76, "#122d49");
      carbon.addColorStop(1, "#061624");
      ctx.fillStyle = carbon;
      ctx.fillRect(0, 0, 128, 512);
      for (const x of [17, 22, 105, 110]) {
        ctx.fillStyle = x < 24 || x > 108 ? "#9ae7ee" : "#568ea9";
        ctx.fillRect(x, 17, 2.5, 476);
      }
      ctx.fillStyle = "rgba(255,255,255,.30)";
      for (let z = 28; z < 498; z += 29) {
        ctx.beginPath();
        ctx.moveTo(37, z);
        ctx.lineTo(92, z + 21);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(180,226,235,.24)";
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#d2edf1";
      ctx.font = "bold 18px Arial, sans-serif";
      ctx.fillText("ALPINE", 64, 185);
      ctx.font = "bold 13px Arial, sans-serif";
      ctx.fillText("SKI PRO", 64, 208);
      ctx.fillStyle = "#65d7e6";
      ctx.fillRect(36, 252, 56, 7);
      ctx.fillRect(42, 262, 44, 3);
      const topsheet = new pc.Texture(this.app.graphicsDevice, {
        name: "Original carbon racing ski topsheet PBR albedo", mipmaps: true,
      });
      topsheet.setSource(canvas);
      topsheet.addressU = topsheet.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
      topsheet.anisotropy = 8;
      this.ownedTextures.push(topsheet);
      this.material.diffuseMap = topsheet;
      this.material.update();
    }
    const base = material("Ski graphite", "#102736", 0.45, 0.6);
    const poleGrip = material("Professional pole grips", "#202b34", 0.04, 0.5);
    const poleFerrule = material("Steel carbide pole tip", "#cad4d8", 0.65, 0.75);
    const handGuard = material("Compact Super-G grip guard", "#2c333b", 0.08, 0.49);
    this.ownedMaterials.push(this.material, base, poleGrip, poleFerrule, handGuard);
    for (const side of [-1, 1]) {
      const e = new pc.Entity("Independent ski");
      this.root.addChild(e);
      // The new GLB includes 212 cm skis, boots and bindings parented to
      // LeftFoot/RightFoot. Keep legacy ski geometry only for the old rig.
      e.enabled = !this.isSeamless;
      this.skis.push(e);
      const p: number[] = [],
        indices: number[] = [],
        uv: number[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          z = (t - 0.5) * equipment.length;
        const w = 0.047 + 0.014 * Math.pow(t * 2 - 1, 2);
        const y = 0.045 + Math.pow(Math.max(0, t - 0.8) / 0.2, 2) * 0.13;
        for (const x of [-w, w]) {
          p.push(x, y, z);
          uv.push(x < 0 ? 0 : 1, t);
        }
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
        undefined,
        uv,
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
      const pole = equipment.id === "SG"
        ? new pc.Entity("Super-G curved carbon pole")
        : shape(
          this.root, "cylinder", "Carbon ski pole",
          [side * 0.38, 0.5, 0.05],
          [PRO_POLE.shaftDiameter, PRO_POLE.shaftLength, PRO_POLE.shaftDiameter], base,
        );
      if (equipment.id === "SG") {
        this.root.addChild(pole);
        // Original continuous swept tube, not disjoint rigid cylinders.
        // A modest aerodynamic bow is specific to the speed disciplines.
        const v:number[] = [], t:number[] = [], uv:number[] = [];
        const rings=13, radial=8;
        for(let j=0;j<=rings;j++) {
          const r=j/rings, y=(r-.5)*PRO_POLE.shaftLength;
          const bow=.10*Math.sin(Math.PI*r)**2;
          for(let k=0;k<=radial;k++) {
            const angle=k*2*Math.PI/radial;
            v.push(Math.cos(angle)*PRO_POLE.shaftDiameter*.5,
              y, bow+Math.sin(angle)*PRO_POLE.shaftDiameter*.5);
            uv.push(k/radial,r);
            if(j && k) {
              const a=(j-1)*(radial+1)+k-1,b=j*(radial+1)+k-1;
              t.push(a,b,a+1,a+1,b,b+1);
            }
          }
        }
        meshEntity(app.graphicsDevice,pole,"Continuous SG bowed pole shaft",
          v,t,base,undefined,uv);
      }
      this.poles.push(pole);
      // Speed-discipline poles: small basket, ergonomic grip, compact guard.
      // Large slalom hand shields would be wrong for a Super-G racer.
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
        pole, "box", "Compact aerodynamic speed grip guard",
        [side * 0.022, PRO_POLE.shaftLength / 2 - 0.07, 0.015],
        [0.045, 0.062, 0.018],
        handGuard,
      );
    }
    // Lightweight original detail meshes make the silhouette and equipment
    // readable up close. They follow existing GLB bones, not a separate rig.
    if (!this.isSeamless) {
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
    // Only the original connected SG player uses this new articulating IK.
    // Do not run both controllers: the old sagittal loop would undo ski heading.
    if (this.isSeamless && !ghost && equipment.id === "SG" && !this.authoredPreview) {
      this.competitionDirector = new SuperGRacePoseDirector(this, equipment);
    }
  }
  getCompetitionDiagnostics(): SGDirectorDiagnostics | null {
    return this.competitionDirector?.getDiagnostics() ?? null;
  }
  paint(hex: string) {
    for (const c of this.rig.findComponents("render")) {
      for (const mi of (c as pc.RenderComponent).meshInstances) {
        // Preserve the graphite compression side panels and the white bib.
        // Only recolour the base fabric; pro racewear needs multiple materials.
        if (
          mi.material?.name.startsWith("Race suit / alpine navy") ||
          mi.material?.name.startsWith("Race suit / alpine crimson") ||
          mi.material?.name.startsWith("Race suit / ember") ||
          (this.isSeamless && mi.material?.name.startsWith("One-piece anatomically joined"))
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
    if (this.authoredPreview) {
      // This isolated studio mode shows the original GLB keyframed motion.
      // It is not a scored-race animation: ski-snow contact is not retargeted.
      const y = terrainHeight(f.x, f.z, c) + f.height;
      const [, grade] = gradient(f.x, f.z, c);
      this.root.setPosition(f.x, y + 0.015, f.z);
      this.root.setEulerAngles(-Math.atan(grade) * 180 / Math.PI,
        f.heading * 180 / Math.PI, 0);
      return;
    }
    // Never execute legacy rotations after the 3D director: the feet, bindings,
    // and tips need to retain their own world direction and edge angle.
    if (this.competitionDirector) {
      this.competitionDirector.update(f, c, dt);
      return;
    }
    const y = terrainHeight(f.x, f.z, c) + f.height;
    this.root.setPosition(f.x, y + 0.015, f.z);
    const [, grade] = gradient(f.x, f.z, c);
    const pitch = (-Math.atan(grade) * 180) / Math.PI;
    const yaw = (f.heading * 180) / Math.PI;
    this.root.setEulerAngles(pitch, yaw, this.visualBank);
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
      // Super-G racers carry the poles; they do not make full SL-style plants
      // at every large, high-speed turn transition.
      this.plantEnergy = this.equipment.id === "SG" ? 0.24 : 1;
    }
    if (side !== 0) this.lastTurnSide = side;
    this.plantEnergy *= Math.exp(-Math.max(0, dt) * 8);
    const load = Math.max(0, Math.min(1.4, f.flex ?? 0));
    const startPhase = f.startPhase ?? -2;
    const startBrace = superGStartBrace(startPhase);
    const startPush = f.startPhase === undefined
      ? Math.max(0, Math.min(1, f.startPush ?? 0))
      : startPhase < 0
        ? startBrace * (0.24 + 0.76 * startBrace)
        : startDriveBlend(c.id, startPhase);
    const launchContact = startPoleContact(c.id, startPhase);
    const launchDrive = startDrivePhase(c.id, startPhase);
    const launchExtension = startPhase >= 0 ? Math.sin(Math.PI * Math.min(1,launchDrive)) : 0;
    // New reach is before the finish, toward a LOW photoelectric beam.
    // Legacy finishGesture is retained as a fallback for old replays.
    const finishReach = Math.max(0, Math.min(1,
      f.finishReach ?? f.finishGesture ?? 0));
    const finishPose = superGFinishGesture(finishReach);
    const landing = Math.max(0, Math.min(1, f.landingShock ?? 0));
    const airborne = Math.max(0, Math.min(1, f.height * 1.4));
    const carvePose = superGEdgePose(edge, load, f.skid ?? 0, airborne);
    // Bank the ENTIRE connected athlete and attached skis into the turn;
    // independent hip/shoulder angulation keeps the torso from becoming a
    // rigid plank. Smooth release at jumps and on the transition edge.
    const desiredBank = superGRacerBank(edge, carvePose.engagement, airborne) *
      (1 - 0.85 * finishPose.armReach);
    this.visualBank += (desiredBank - this.visualBank) *
      (1 - Math.exp(-Math.min(0.1, Math.max(0, dt)) * 11));
    this.root.setEulerAngles(pitch, yaw, this.visualBank);
    // A strong loaded edge opens the chest even when the player holds tuck.
    // This smooth visual layer never changes the 120Hz controls/physics.
    const tuckGoal = Math.max(
      Math.max(0, Math.min(1, f.tuck)) *
        (1 - 0.34 * carvePose.engagement),
      // The player can cross the finish without holding the tuck control:
      // the low glove reach still requires a compact, forward-driving body.
      finishPose.armReach * 0.84,
    );
    this.visualTuck += (tuckGoal - this.visualTuck) *
      (1 - Math.exp(-Math.max(0, dt) * 9));
    const tuck = this.visualTuck;
    const impactSide = Math.sign(f.poleImpactSide ?? 0);
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
      this.visualImpact * (impactSide || (edge >= 0 ? -1 : 1)) * 12 -
      Math.sign(edge) * (f.skid ?? 0) * 5;
    this.visualUpperBody += (torsoTarget - this.visualUpperBody) * blend;
    const pressureAbsorption = Math.min(0.065,
      Math.abs((f.pressure ?? 1) - 1) * 0.055);
    const skidStance = Math.min(0.04, (f.skid ?? 0) * 0.04);
    const crouchTarget = 0.055 + tuck * 0.18 +
      Math.abs(edge) * 0.085 + load * 0.045 +
      pressureAbsorption + skidStance +
      startPush * (0.11 - launchExtension * 0.078) + landing * 0.075 + airborne * 0.095 +
      finishPose.drop + carvePose.hipDrop +
      carvePose.engagement * 0.095 + startBrace * 0.050;
    this.visualCrouch += (crouchTarget - this.visualCrouch) * blend;
    // The 25-bone leg IK must not be forced below its anatomical reach.
    const crouch = Math.min(0.455, this.visualCrouch);
    const j = this.joints;
    // The hips move inside the turn while the shoulders look downhill.
    // The outside leg is visibly longer and keeps the ski pressurized.
    const lean = edge * (0.19 + load * 0.065) +
      carvePose.hipInside +
      Math.sign(edge) * carvePose.engagement * 0.09;
    // Seamless GLB faces local -Z. The old athlete faced +Z: bending the
    // torso forward requires reversed local X rotation on the new model.
    const pitchSign = this.isSeamless ? -1 : 1;
    j.Pelvis?.setLocalPosition(lean + shake,
      (this.isSeamless ? 1.01 : 0.92) - crouch,
      (this.isSeamless ? 0.015 : 0) - 0.055 * tuck -
        startBrace * 0.04 - finishPose.forward);
    // Professional race start: chest ahead of bindings, hips loaded,
    // alternating pole-drive phase. Airborne posture retracts legs.
    // Double-pole plant is synchronized with the fixed-step acceleration
    // pulses. The hips extend with the shoulder drive, not independently.
    const pushCycle = launchExtension * (1 - Math.min(1, Math.abs(edge)));
    j.Spine?.setLocalEulerAngles(
      pitchSign * (10 + tuck * 27 + startPush * 23 + startBrace * 11 -
        airborne * 7 + finishReach * 23),
      edge * -4 + this.visualImpact * 6,
      -edge * (18 + outsidePressure * 8) -
        Math.sign(edge) * carvePose.pelvicAngle * 0.40,
    );
    // Stabilize the professional racer's upper body toward the fall line while
    // hips and loaded outside leg continue carving below.
    j.Chest?.setLocalEulerAngles(
      pitchSign * (5 + tuck * 12 + this.visualImpact * 5 +
        finishReach * 10),
      this.visualUpperBody, edge * (12 - load * 2) +
        Math.sign(edge) * carvePose.pelvicAngle * 0.18 + shake * 90,
    );
    j.Head?.setLocalEulerAngles(
      pitchSign * (-12 - tuck * 23 + this.visualImpact * 3 -
        startPush * 12 + finishReach * 9),
      edge * 7 - this.visualImpact * 3,
      edge * 3 - Math.sign(edge) * carvePose.headCounterAngle - shake * 80,
    );
    j.Pelvis?.setLocalEulerAngles(0, edge * 2,
      -edge * (19 + outsidePressure * 7) -
        Math.sign(edge) * carvePose.pelvicAngle);
    // Analytic sagittal two-link IK. Flexion follows COM height and outside-leg loading.
    for (const [i, side] of ["L", "R"].entries()) {
      const outside = (i === 0 ? 1 : -1) * edge;
      // The outside leg extends under pressure, the unloaded inside leg
      // retracts slightly. Both ankles remain animated by the existing IK.
      let hipRot: number, kneeRot: number;
      if (this.isSeamless) {
        // The 25-bone model is NOT shaped like the old 18-bone avatar.
        // Solve against its measured GLB femur/shin vectors: the ski soles
        // stay on snow when the pelvis compresses, instead of sinking through.
        const lift = superGSkiFootLift(outside, carvePose.engagement);
        const leg = superGLegIK(1.01 - crouch, lift);
        hipRot = leg.hipPitch;
        kneeRot = leg.kneePitch;
      } else {
        // Preserve the original athlete/ghost's proven older rest pose.
        const hipY = 0.9 - crouch + outside * (0.048 + outsidePressure * 0.027);
        const dy = Math.min(0.81, hipY - 0.12);
        const dz = 0.02 + tuck * 0.055;
        const L1 = 0.421, L2 = 0.396;
        const d = Math.sqrt(dy * dy + dz * dz);
        const alpha = Math.acos(Math.max(-1, Math.min(1,
          (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
        const thigh = Math.atan2(dz, dy) + alpha;
        const calf = Math.atan2(dz - Math.sin(thigh) * L1,
          dy - Math.cos(thigh) * L1);
        const hipRestAngle = Math.atan2(0.13, 0.4);
        const calfRestAngle = Math.atan2(-0.11, 0.38);
        hipRot = (-(thigh - hipRestAngle) * 180) / Math.PI;
        kneeRot = (-(calf - calfRestAngle) * 180) / Math.PI - hipRot;
      }
      const flightHip = airborne * -12;
      const flightKnee = airborne * 23;
      j[side + "Hip"]?.setLocalEulerAngles(
        hipRot + flightHip + landing * 7 - startPush * pushCycle * 12,
        -outside * 6, edge * (12 + outsidePressure * 5),
      );
      j[side + "Knee"]?.setLocalEulerAngles(
        kneeRot + flightKnee + landing * 9 + startPush * pushCycle * 15,
        0, outside * (3 + outsidePressure * 3),
      );
      j[side + "Ankle"]?.setLocalEulerAngles(
        -hipRot - kneeRot, 0,
        -edge * (this.isSeamless ? 28 + outsidePressure * 6 :
          10 + outsidePressure * 6) + shake * 150,
      );
      const activePlant = ((i === 0 ? 1 : -1) === this.plantingSide)
        ? this.plantEnergy : 0;
      const nearGate = impactSide === (i === 0 ? -1 : 1);
      // Gate-side shoulder wraps the pole. The finish hand extends
      // FORWARD and DOWN towards the beam, never raised above the head.
      const shoulderWrap = this.visualImpact * (nearGate ? 38 : -9);
      // Both arms plant together for the first strokes; the shoulders and
      // elbows follow through as the hips and legs extend against the snow.
      const pushStroke = startPush * (-39 + pushCycle * 49 - launchContact * 8);
      const reachingHand = i === 1 ? finishPose.armReach : 0;
      const outsideArm = outside > 0;
      // The 25-bone GLB has a distinct collarbone and upper arm. Animate
      // BOTH, while keeping the clavicles close and elbows tucked in high
      // speed. The old rig/ghost simply skips the extra upper-arm joint.
      j[side + "Shoulder"]?.setLocalEulerAngles(
        pitchSign * (-tuck * 15 +
          Math.sin(f.t * 2.3 + i) * Math.abs(edge) * 2 -
          activePlant * 8 + shoulderWrap + pushStroke -
          (i === 1 ? 35 : 6) * finishPose.armReach),
        -edge * 3,
        (i === 0 ? -1 : 1) *
          (6 + Math.abs(edge) * 8 + (f.skid ?? 0) * 5 - tuck * 2 +
            (i === 0 ? 10 : 0) * finishPose.armReach),
      );
      j[side + "UpperArm"]?.setLocalEulerAngles(
        pitchSign * (-tuck * 20 -
          carvePose.engagement * (outsideArm ? 3 : 8) +
          reachingHand * 40),
        (i === 0 ? 1 : -1) * (tuck * 5 + carvePose.engagement * 3),
        0,
      );
      j[side + "Elbow"]?.setLocalEulerAngles(
        pitchSign * (-tuck * 36 - activePlant * 7 +
          startPush * (21 + pushCycle * 26) + reachingHand * 56),
        0, 0,
      );
      j[side + "Wrist"]?.setLocalEulerAngles(
        pitchSign * (-startPush * (7 + pushCycle * 8) +
          reachingHand * 9),
        0, 0,
      );
      // The new monobloc GLB carries its own long Super-G skis, boots and
      // race bindings parented to the corrected foot bones. Avoid updating
      // invisible legacy meshes/vertex buffers on every animation frame.
      if (!this.isSeamless) {
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
          outside * (f.skid ?? 0) * 3.5 + airborne * 4,
          outside * 1.5,
          -edge * (45 + outsidePressure * 6) * (1 - airborne * 0.52) + shake * 90,
        );
        this.skis[i].setLocalPosition(
          (i === 0 ? -1 : 1) * (0.16 + Math.abs(edge) * 0.035),
          Math.max(0, -outside) * 0.029 + Math.abs(outside) * 0.008,
          0.02,
        );
      }
      const wrist = j[side + "Wrist"];
      if (wrist) {
        const wristWorld = wrist.getPosition();
        const inverse = this.root.getWorldTransform().clone().invert();
        const point = inverse.transformPoint(wristWorld);
        const activePlant = ((i === 0 ? 1 : -1) === this.plantingSide)
          ? this.plantEnergy : 0;
        const gripDistance =
          (PRO_POLE.shaftLength - PRO_POLE.gripLength) * 0.5;

        // Free-flight pole position: the shaft points back, aerodynamically
        // following the glove without slicing through the snow on low turns.
        const polePitch = 48 + tuck * 23 + carvePose.engagement * 11 +
          airborne * 10 - activePlant * 18 +
          (i === 1 ? 10 : 0) * finishPose.armReach;
        const poleRoll = (i === 0 ? -1 : 1) * (6 + activePlant * 5);
        const trailRot = new pc.Quat().setFromEulerAngles(
          polePitch, 0, poleRoll);
        const trailGrip = trailRot.transformVector(
          new pc.Vec3(0, gripDistance, 0));
        const trailPos = point.clone().sub(trailGrip);

        // The physical acceleration has three distinct Gaussian impulses,
        // not a 1.45-second permanent pole plant. Match that rhythm while
        // crossfading the pole rotation/position instead of hard cuts.
        const plantGoal = c.id !== "SG" ? 0 : startPhase < 0
          ? startBrace : startPhase < 1.45
            ? Math.max(0, Math.min(1, (launchContact - 0.32) * 3))
            : 0;
        const oldWeight = this.polePlantWeights[i];
        const poleRate = plantGoal > oldWeight ? 27 : 19;
        const poleBlend = 1 - Math.exp(-Math.max(0, dt) * poleRate);
        const plantWeight = oldWeight +
          (plantGoal - oldWeight) * poleBlend;
        this.polePlantWeights[i] = plantWeight;

        if (plantWeight > 0.003) {
          // Grounded pole pose, calculated from actual track terrain. The
          // rubber grip and the glove coincide on BOTH start and free poses.
          const basketX = wristWorld.x + (i === 0 ? -0.045 : 0.045);
          const ground = terrainHeight(basketX, wristWorld.z - 0.33, c) + 0.025;
          const vertical = Math.max(0.10, Math.min(
            PRO_POLE.shaftLength * 0.96, wristWorld.y - ground));
          const behind = Math.sqrt(Math.max(0.04,
            PRO_POLE.shaftLength ** 2 - vertical ** 2));
          const tip = inverse.transformPoint(new pc.Vec3(
            basketX, ground, wristWorld.z - behind));
          const tipToGrip = point.clone().sub(tip).normalize();
          const plantRot = new pc.Quat().setFromDirections(
            pc.Vec3.UP, tipToGrip);
          const blendedRotation = new pc.Quat().slerp(
            trailRot, plantRot, plantWeight);
          // Position MUST be derived from the FINAL rotation, otherwise
          // a linear interpolation of shaft centres detaches the grip from
          // the hand even if both endpoint poses were correct.
          const gripFromRotation = blendedRotation.transformVector(
            new pc.Vec3(0, gripDistance, 0));
          this.poles[i].setLocalRotation(blendedRotation);
          this.poles[i].setLocalPosition(
            point.clone().sub(gripFromRotation));
        } else {
          this.poles[i].setLocalRotation(trailRot);
          this.poles[i].setLocalPosition(trailPos);
        }
      }
    }
    // Blend falls and recovery rather than snapping the entire body.
    const desiredFall = f.fallen > 0 ? 1 : 0;
    this.visualFall += (desiredFall - this.visualFall) *
      (1 - Math.exp(-Math.max(0, dt) * 10));
    // The scene root already banks the skier AND attached skis. Bank the
    // rig only on a fall; a second roll here would cancel the carve angle.
    this.rig.setLocalEulerAngles(
      0, this.isSeamless ? 180 : 0, this.visualFall * 76,
    );
    this.rig.setLocalPosition(0, this.visualFall * 0.15, 0);
  }
  destroy() {
    this.root.destroy();
    this.ownedMaterials.forEach((m) => m.destroy());
    this.ownedTextures.forEach((t) => t.destroy());
  }
}
