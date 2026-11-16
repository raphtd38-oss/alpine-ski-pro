import * as pc from "playcanvas";
import { formatTime } from "../game/race";
import { AlpineAssets } from "./alpine-assets";
import { terrainHeight, gradient } from "../game/course";
import { trainingLineX } from "../game/guide";
import { sampleSnowSurface } from "../game/surface";
import { snowTexel } from "./snow-texture";
import { gatePoleCanvas, gateBannerCanvas } from "./gate-textures";
import { gateFlagFlutter } from "../game/gates-visual";
import { tipVibration, type PoleState } from "../game/poles";
import { SUPER_G_ROLLERS } from "../game/superg";
import type { Course, Quality, Weather } from "../game/types";
import { material, meshEntity, shape, beam, rng, color } from "./geometry";
export class World {
  root = new pc.Entity("Alpine world");
  gateEntities: pc.Entity[] = [];
  startArch: pc.Entity | null = null;
  startWands: pc.Entity[] = [];
  startBooth: pc.Entity | null = null;
  trainingGuide: pc.Entity | null = null;
  resources: pc.Texture[] = [];
  materials: pc.StandardMaterial[] = [];
  timingSign: { canvas: HTMLCanvasElement; texture: pc.Texture } | null = null;
  timingLabel = "";
  snow: pc.StandardMaterial;
  red: pc.StandardMaterial;
  blue: pc.StandardMaterial;
  dark: pc.StandardMaterial;
  redPole: pc.StandardMaterial;
  bluePole: pc.StandardMaterial;
  redFlag: pc.StandardMaterial;
  blueFlag: pc.StandardMaterial;
  gateVisualTime = 0;
  constructor(
    public app: pc.Application,
    public course: Course,
    public quality: Quality,
    public alpineAssets: AlpineAssets | null = null,
  ) {
    app.root.addChild(this.root);
    this.snow = this.mat("Crystalline snow", "#e8f1f5", 0.03, 0.32);
    this.snow.diffuseVertexColor = true;
    this.snow.update();
    this.red = this.mat("Race vermilion", "#f65135");
    this.blue = this.mat("Race cobalt", "#1679d8");
    this.dark = this.mat("Graphite", "#152b3a", 0.3, 0.35);
    this.redPole = this.gateMaterial("red", false);
    this.bluePole = this.gateMaterial("blue", false);
    this.redFlag = this.gateMaterial("red", true);
    this.blueFlag = this.gateMaterial("blue", true);
    if (!this.alpineAssets?.applySnowMaterial(this.snow)) this.snowTexture();
    this.terrain();
    this.buildTrainingGuide();
    this.mountains();
    this.forest();
    this.gates();
    if (this.course.id === "SG") this.superGMarkers();
    this.fences();
    this.buildings();
    this.finishArena();
    this.lift();
    this.alpineAssets?.populate(this.root, this.course, this.quality);
  }
  mat(name: string, hex: string, metal = 0, gloss = 0.25) {
    const m = material(name, hex, metal, gloss);
    this.materials.push(m);
    return m;
  }
  gateMaterial(tone: "red" | "blue", flag: boolean) {
    const source = flag ? gateBannerCanvas(tone) : gatePoleCanvas(tone);
    const tex = new pc.Texture(this.app.graphicsDevice, {
      name: `Original ${tone} ${flag ? "race textile" : "slalom fibreglass"}`,
      mipmaps: true,
    });
    tex.setSource(source);
    tex.anisotropy = 4;
    this.resources.push(tex);
    const m = this.mat(`Competition ${tone} ${flag ? "cloth flag" : "pole"}`,
      "#ffffff", flag ? 0.0 : 0.08, flag ? 0.18 : 0.48);
    m.diffuseMap = tex;
    m.cull = pc.CULLFACE_NONE;
    m.update();
    return m;
  }
  snowTexture() {
    // CPU-generated PBR maps are created once at level load, not every frame.
    // They provide soft grooming ridges, micro-normal sparkle and varying
    // roughness with no external assets or extra draw calls.
    const size = 512;
    const albedo = document.createElement("canvas");
    const normal = document.createElement("canvas");
    const rough = document.createElement("canvas");
    for (const canvas of [albedo, normal, rough])
      canvas.width = canvas.height = size;
    const ac = albedo.getContext("2d")!;
    const nc = normal.getContext("2d")!;
    const rc = rough.getContext("2d")!;
    const ai = ac.createImageData(size, size);
    const ni = nc.createImageData(size, size);
    const ri = rc.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const texel = snowTexel(x, y);
        const [r, g, b] = texel.diffuse;
        const [nx, ny, nz] = texel.normal;
        ai.data.set([r, g, b, 255], i);
        ni.data.set([nx, ny, nz, 255], i);
        ri.data.set([texel.roughness, texel.roughness, texel.roughness, 255], i);
      }
    ac.putImageData(ai, 0, 0);
    nc.putImageData(ni, 0, 0);
    rc.putImageData(ri, 0, 0);
    const tex = (canvas: HTMLCanvasElement, name: string) => {
      const texture = new pc.Texture(this.app.graphicsDevice, {
        name,
        mipmaps: true,
      });
      texture.setSource(canvas);
      texture.addressU = texture.addressV = pc.ADDRESS_REPEAT;
      texture.anisotropy = 8;
      this.resources.push(texture);
      return texture;
    };
    this.snow.diffuseMap = tex(albedo, "Soft groomed snow albedo");
    this.snow.normalMap = tex(normal, "Fine grain snow normals");
    this.snow.glossMap = tex(rough, "Compacted snow PBR roughness");
    this.snow.glossMapChannel = "r";
    this.snow.glossInvert = true;
    this.snow.gloss = 1;
    this.snow.bumpiness = 0.32;
    this.snow.update();
  }
  terrain() {
    const p: number[] = [],
      ind: number[] = [],
      col: number[] = [],
      uv: number[] = [];
    const nx = 80,
      nz = Math.ceil((this.course.length + 240) / 5),
      width = 260;
    for (let j = 0; j <= nz; j++) {
      const z = -100 + (j * (this.course.length + 240)) / nz;
      for (let i = 0; i <= nx; i++) {
        const x = (i / nx - 0.5) * width;
        const h = terrainHeight(x, z, this.course);
        p.push(x, h, z);
        uv.push(x / 2, z / 3);
        const edge = Math.min(
          1,
          Math.max(0, (Math.abs(x) - this.course.width / 2) / 20),
        );
        const n =
          Math.sin(x * 1.2 + z * 0.38) * Math.sin(z * 0.63 + x * 0.2) * 0.018;
        // Broad, subtle blue-grey compressed patches match the grip field.
        const icy = sampleSnowSurface(x, z, this.course).ice;
        col.push(
          1 - edge * 0.11 + n - icy * 0.075,
          1 - edge * 0.075 + n - icy * 0.036,
          1 - edge * 0.04 + n - icy * 0.012,
          1,
        );
      }
    }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i,
          b = a + nx + 1;
        ind.push(a, b, a + 1, a + 1, b, b + 1);
      }
    meshEntity(
      this.app.graphicsDevice,
      this.root,
      "Continuous piste terrain",
      p,
      ind,
      this.snow,
      col,
      uv,
    );
    // Fine piste strips follow the exact ground surface and make corduroy readable at close range.
  }
  buildTrainingGuide() {
    // An original narrow glowing line is visible in training only.
    // A single batched mesh keeps its draw cost constant along the slope.
    const positions: number[] = [];
    const indices: number[] = [];
    const step = 1.5;
    for (let z = 3, n = 0; z <= this.course.length; z += step, n++) {
      const zz = Math.min(this.course.length, z);
      const x = trainingLineX(this.course, zz);
      const y = terrainHeight(x, zz, this.course) + 0.032;
      const width = 0.07;
      positions.push(x - width, y, zz, x + width, y, zz);
      if (n > 0) {
        const a = 2 * (n - 1);
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const mat = this.mat("Training advisory racing line", "#60dce0", 0.05, 0.6);
    mat.emissive.set(0.07, 0.25, 0.27);
    mat.opacity = 0.50;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    this.trainingGuide = meshEntity(
      this.app.graphicsDevice, this.root,
      "Training centreline, not competition assistance",
      positions, indices, mat,
    );
    this.trainingGuide.render!.castShadows = false;
    this.trainingGuide.enabled = false;
  }
  mountains() {
    const mat = this.mat("Snow and granite massif", "#eef3f6");
    mat.diffuseVertexColor = true;
    mat.update();
    const random = rng(722);
    const granite = this.mat("Exposed granite cliffs", "#48565e", 0.05, 0.2);
    for (let side = -1; side <= 1; side += 2) {
      const p: number[] = [],
        idx: number[] = [],
        cols: number[] = [];
      const rockIndices: number[] = [];
      const n = 72,
        m = 64;
      for (let j = 0; j <= m; j++)
        for (let i = 0; i <= n; i++) {
          const z = -500 + (j * (this.course.length + 1300)) / m,
            x = side * (120 + i * 19);
          const base = terrainHeight(side * 120, z, this.course);
          const envelope = Math.sin(Math.min(1, i / n) * Math.PI) * 265;
          const ridges =
            Math.abs(Math.sin(z * 0.0048 + x * 0.009)) +
            Math.abs(Math.sin(z * 0.011 - x * 0.006)) * 0.36;
          const noise =
            ((random() - 0.5) * 45 +
              Math.sin(x * 0.087 + z * 0.041) * 15 +
              Math.sin(z * 0.109 - x * 0.07) * 8) *
            Math.sin((i / n) * Math.PI);
          const y = base + envelope * ridges + noise;
          p.push(x, y, z);
          const rock = Math.max(
            0,
            Math.sin(x * 0.04 + z * 0.013) * Math.sin(z * 0.023 + x * 0.03),
          );
          const shade = 0.98 - rock * 0.48;
          cols.push(shade * 0.96, shade, Math.min(1, shade * 1.04), 1);
        }
      for (let j = 0; j < m; j++)
        for (let i = 0; i < n; i++) {
          const a = j * (n + 1) + i,
            b = a + n + 1;
          const slopeX = Math.abs(p[(a + 1) * 3 + 1] - p[a * 3 + 1]) / 19;
          const slopeZ =
            Math.abs(p[b * 3 + 1] - p[a * 3 + 1]) /
            ((this.course.length + 1300) / m);
          const target =
            i > 5 && (slopeX > 1.05 || slopeZ > 0.9) ? rockIndices : idx;
          if (side > 0) target.push(a, b, a + 1, a + 1, b, b + 1);
          else target.push(a, a + 1, b, a + 1, b + 1, b);
        }
      meshEntity(
        this.app.graphicsDevice,
        this.root,
        "Alpine massif",
        p,
        idx,
        mat,
        cols,
      );
      if (rockIndices.length)
        meshEntity(
          this.app.graphicsDevice,
          this.root,
          "Rock outcrops",
          p,
          rockIndices,
          granite,
        );
    }
  }
  forest() {
    const random = rng(406);
    const p: number[] = [],
      idx: number[] = [],
      cols: number[] = [];
    const mat = this.mat("Snow-laden spruce", "#ffffff");
    mat.diffuseVertexColor = true;
    mat.update();
    const count = { low: 130, medium: 250, high: 380, ultra: 600 }[
      this.quality
    ];
    for (let t = 0; t < count; t++) {
      const x = (t % 2 ? 1 : -1) * (this.course.width / 2 +
        (this.alpineAssets?.has("fir") ? 39 : 6) + random() * 75),
        z = -50 + random() * (this.course.length + 140),
        y = terrainHeight(x, z, this.course),
        h = 4 + random() * 8;
      for (let level = 0; level < 6; level++) {
        const by = y + h * 0.12 + level * h * 0.135,
          r = h * 0.26 * (1 - level / 7),
          top = by + h * 0.38;
        const start = p.length / 3;
        const sides = 9;
        p.push(x, top, z);
        cols.push(0.73, 0.83, 0.85, 1);
        for (let k = 0; k <= sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const radius = r * (0.85 + random() * 0.3);
          p.push(
            x + Math.cos(a) * radius,
            by + (k % 2) * 0.25,
            z + Math.sin(a) * radius,
          );
          // In the reference film the spruces remain dark evergreen with
          // snow on branch tips, not almost entirely white/blue silhouettes.
          const snowyBranch = k % 4 === 0 || (level > 3 && k % 4 === 1);
          cols.push(
            ...(snowyBranch
              ? [0.74 + level * 0.027, 0.82 + level * 0.022,
                 0.81 + level * 0.022, 1]
              : [0.075 + level * 0.014, 0.19 + level * 0.012,
                 0.17 + level * 0.012, 1]),
          );
          if (k > 0) idx.push(start, start + k + 1, start + k);
        }
      }
    }
    const e = meshEntity(
      this.app.graphicsDevice,
      this.root,
      "Batched spruce forest",
      p,
      idx,
      mat,
      cols,
    );
    e.render!.castShadows = this.quality !== "low";
  }
  gates() {
    for (const g of this.course.gates) {
      const parent = new pc.Entity(`Gate ${g.id + 1}`);
      this.root.addChild(parent);
      const m = g.id % 2 === 0 ? this.redPole : this.bluePole;
      const textile = g.id % 2 === 0 ? this.redFlag : this.blueFlag;
      for (const side of [-1, 1]) {
        const x = g.x + (side * g.width) / 2,
          h = terrainHeight(x, g.z, this.course);
        const pivot = new pc.Entity("Pole hinge");
        pivot.setLocalPosition(x, h, g.z);
        parent.addChild(pivot);
        // Two aligned sections preserve the V1.4 gate meshes while making
        // fiberglass flex visible along the shaft, not only at the hinge.
        const pole = shape(
          pivot,
          "cylinder",
          "Flexible slalom pole",
          [0, 0.64, 0],
          [0.035, 1.28, 0.035],
          m,
        );
        pole.tags.add("pole");
        const tip = new pc.Entity("Pole elastic upper section");
        tip.setLocalPosition(0, 1.28, 0);
        pivot.addChild(tip);
        const tipShaft = shape(
          tip, "cylinder", "Fiberglass flexing pole tip",
          [0, 0.36, 0], [0.033, 0.72, 0.033], m,
        );
        tipShaft.render!.castShadows = this.quality !== "low";
        // SL retains its real-world flexible bare poles. GS/SG/DH get short
        // textured fabric panels tethered to their spring hinges; the cloth
        // moves with a hit rather than remaining frozen in world space.
        if (this.course.id !== "SL") {
          // A speed-race gate is two separate pole pairs (4 poles total).
          // Each 0.75 x 0.50 m textile panel spans its own pair, outside
          // the ski crossing corridor; FIS-style, not FIS-homologated.
          const partner = shape(
            pivot, "cylinder", "Second pole of flag pair",
            [side * 0.80, 0.94, -0.08],
            [0.034, 1.88, 0.034], m,
          );
          partner.render!.castShadows = this.quality !== "low";
          const banner = shape(
            pivot, "box", "Gate textile flag",
            [side * 0.40, 1.45, -0.08],
            [0.79, 0.5, 0.026], textile,
          );
          banner.render!.castShadows = false;
        }
      }
      this.gateEntities.push(parent);
    }
    if (this.course.id === "SG") this.superGStartBooth();
    else this.arch(3, "DÉPART", false);
    this.arch(this.course.length, "ARRIVÉE", true);
  }

  /** An original start hut inspired by World Cup speed events. This is
   * competition set dressing, not an official FIS-certified installation. */
  superGStartBooth() {
    const root = new pc.Entity("Super-G competition start house");
    this.startBooth = root;
    this.root.addChild(root);
    const h = terrainHeight(0, 0, this.course);
    const timber = this.mat("Start house weathered timber", "#594a41", 0, 0.28);
    const painted = this.mat("Start house race blue", "#24445c", 0.08, 0.32);
    const glass = this.mat("Timer hut safety glass", "#608c9e", 0.25, 0.75);
    const metal = this.mat("Start timing aluminium", "#aebdc6", 0.75, 0.55);
    // Open front and rear: the chase camera keeps a clear sightline to skier.
    for (const z of [-4.5, 4.3])
      for (const x of [-3.8, 3.8])
        shape(root, "box", "Start hut structural post",
          [x, terrainHeight(x, z, this.course) + 1.9, z],
          [0.23, 3.8, 0.23], timber);
    for (const z of [-4.5, 4.3]) {
      shape(root, "box", "Start chalet roof frame",
        [0, h + 3.9, z], [7.9, 0.18, 0.28], timber);
      shape(root, "box", "Start timing station fascia",
        [0, h + 3.45, z], [7.7, 0.52, 0.22], painted);
    }
    for (const side of [-1, 1]) {
      const roof = shape(root, "box", "Insulated pitched start roof",
        [side * 2.0, h + 4.56, -0.10],
        [4.45, 0.24, 10.0], this.snow);
      roof.setEulerAngles(0, 0, side * -21);
      for (const z of [-2.8, 1.2])
        shape(root, "box", "Start hut windscreen",
          [side * 3.83, h + 2.20, z],
          [0.11, 1.95, 2.7], glass);
      shape(root, "box", "Gate safety handrail",
        [side * 2.23, h + 0.8, 5.1],
        [0.08, 0.09, 2.7], metal);
    }
    // Start line and pressure-sensitive hinged timing wands at ski level.
    const gateZ = 4.05, gateH = terrainHeight(0, gateZ, this.course);
    for (const side of [-1, 1]) {
      const hinge = new pc.Entity("Chronometric start wand hinge");
      hinge.setLocalPosition(side * 1.55, gateH + 0.64, gateZ);
      root.addChild(hinge);
      this.startWands.push(hinge);
      shape(hinge, "cylinder", "Start wand support",
        [0, -0.30, 0], [0.065, 0.74, 0.065], painted);
      shape(hinge, "box", "Releasing timing wand",
        [-side * 0.78, 0, 0], [1.55, 0.032, 0.043], metal);
      shape(hinge, "box", "Light gate sensor",
        [0, 0.11, 0], [0.18, 0.16, 0.16], painted);
    }
    const header = this.sign("ALPINE SKI PRO   /   SUPER-G",
      6.4, 0.65, "#183247");
    shape(root, "box", "Start house illuminated race header",
      [0, h + 3.48, 4.44], [6.4, 0.65, 0.1], header.m);
    const slab = this.mat("Starting runway blue ink", "#3e93b9", 0, 0.35);
    for (const x of [-1.78, 1.78])
      shape(root, "box", "Timing alignment strip",
        [x, terrainHeight(x, gateZ, this.course) + 0.02, gateZ],
        [0.055, 0.025, 1.0], slab);
  }

  /** Smoothly open hinged chronometric wands after the launch. */
  updateStartWands(startPush = 0, positionZ = 3, raceStarted = false) {
    if (!this.startWands.length) return;
    const opening = positionZ > 5 ? 1 :
      raceStarted ? Math.max(0, Math.min(1, (1 - startPush) * 6)) : 0;
    this.startWands.forEach((wand, i) => {
      wand.setLocalEulerAngles(0, (i === 0 ? 1 : -1) * opening * 76, 0);
    });
  }

  /** Blue terrain marks on the approach to the five speed crests.
   * One batched geometry, no expensive per-frame decal updates. */
  superGMarkers() {
    const p: number[] = [], indices: number[] = [];
    for (const bump of SUPER_G_ROLLERS) {
      const z = bump.z - 14;
      for (let i = 0; i < 32; i++) {
        const x0 = (i / 32 - 0.5) * 27;
        const x1 = ((i + 1) / 32 - 0.5) * 27;
        const y0 = terrainHeight(x0, z, this.course) + 0.044;
        const y1 = terrainHeight(x1, z, this.course) + 0.044;
        const n = p.length / 3;
        p.push(x0, y0, z, x1, y1, z,
          x1, terrainHeight(x1, z + 0.21, this.course) + 0.044, z + 0.21,
          x0, terrainHeight(x0, z + 0.21, this.course) + 0.044, z + 0.21);
        indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
      }
      const x = -this.course.width / 2 - 3;
      const y = terrainHeight(x, z, this.course) + 1.2;
      const sign = this.sign(bump.name.toUpperCase(), 4.4, 0.7, "#205a83");
      shape(this.root, "box", "Super-G crest sector marker",
        [x, y, z - 3], [4.4, 0.7, 0.12], sign.m);
    }
    const dye = this.mat("Alpine super-G blue crest dye", "#287eb8", 0, 0.4);
    const strips = meshEntity(this.app.graphicsDevice, this.root,
      "Blue dye approach lines to Super-G jumps", p, indices, dye);
    strips.render!.castShadows = false;
  }

  sign(text: string, width: number, height: number, bg: string) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 192;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 84px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 128);
    const t = new pc.Texture(this.app.graphicsDevice, { mipmaps: true });
    t.setSource(c);
    this.resources.push(t);
    const m = this.mat(text, "#ffffff");
    m.diffuseMap = t;
    m.emissiveMap = t;
    m.emissive.set(0.16, 0.16, 0.16);
    m.update();
    return { m, width, height, canvas: c, texture: t };
  }
  arch(z: number, label: string, finish: boolean) {
    // Group the arch to hide the start banner after departure: it otherwise
    // crosses the entire chase-camera viewport for several seconds.
    const archRoot = new pc.Entity(finish ? "Finish arch" : "Start arch");
    this.root.addChild(archRoot);
    if (!finish) this.startArch = archRoot;
    const w = finish ? 14 : 7,
      h = terrainHeight(0, z, this.course);
    for (const x of [-w / 2, w / 2])
      shape(
        archRoot,
        "box",
        "Arch tower",
        [x, h + 2.1, z],
        [finish ? 1.2 : 0.35, 4.2, finish ? 1.1 : 0.5],
        finish ? this.red : this.dark,
      );
    const sign = this.sign(
      finish ? "ALPINE SKI PRO  /  FINISH" : `ALPINE  /  ${label}`,
      w,
      1,
      finish ? "#d82728" : "#152b3a",
    );
    shape(
      archRoot,
      "box",
      label,
      [0, h + 3.85, z],
      [w, finish ? 1.3 : 1, finish ? 1 : 0.32],
      sign.m,
    );
    if (finish) {
      for (let i = 0; i < 20; i++) {
        const x = -w / 2 + (i * w) / 20;
        shape(
          archRoot,
          "box",
          "Finish checker",
          [x, h + 0.05, z],
          [w / 20, 0.02, 1.1],
          i % 2 ? this.snow : this.dark,
        );
      }
    }
  }
  fences() {
    const mat = this.mat("Safety mesh", "#f47242");
    mat.opacity = 0.57;
    mat.blendType = pc.BLEND_NORMAL;
    mat.cull = pc.CULLFACE_NONE;
    mat.update();
    // Real mesh strands rather than an opaque wall: batched quads, no per-strand draw calls.
    const p: number[] = [],
      idx: number[] = [];
    const quad = (a: number[], b: number[], thick: number) => {
      const n = p.length / 3;
      p.push(
        a[0],
        a[1],
        a[2],
        a[0],
        a[1] + thick,
        a[2],
        b[0],
        b[1] + thick,
        b[2],
        b[0],
        b[1],
        b[2],
      );
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    };
    for (const side of [-1, 1]) {
      const x = (side * this.course.width) / 2;
      for (let z = 0; z < this.course.length + 30; z += 6) {
        const a = terrainHeight(x, z, this.course),
          b = terrainHeight(x, z + 6, this.course);
        for (let y = 0.25; y <= 1.25; y += 0.25)
          quad([x, a + y, z], [x, b + y, z + 6], 0.025);
        for (let dz = 0; dz < 6; dz += 0.5) {
          const y = terrainHeight(x, z + dz, this.course),
            n = p.length / 3;
          p.push(
            x,
            y + 0.2,
            z + dz,
            x,
            y + 1.3,
            z + dz,
            x,
            y + 1.3,
            z + dz + 0.02,
            x,
            y + 0.2,
            z + dz + 0.02,
          );
          idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
        }
        if (z % 18 === 0)
          shape(
            this.root,
            "cylinder",
            "Net support",
            [x, a + 0.7, z],
            [0.06, 1.6, 0.06],
            this.red,
          );
      }
    }
    const e = meshEntity(
      this.app.graphicsDevice,
      this.root,
      "Safety net strands",
      p,
      idx,
      mat,
    );
    e.render!.castShadows = false;
  }
  buildings() {
    const timber = this.mat("Larch timber", "#5a3a2b");
    const glass = this.mat("Glacier glass", "#497887", 0.65, 0.8);
    for (const z of [0, this.course.length + 25]) {
      if (this.alpineAssets?.has("chalet")) break;
      const x = -this.course.width / 2 - 15,
        h = terrainHeight(x, z, this.course);
      shape(
        this.root,
        "box",
        "Alpine chalet",
        [x, h + 2, z],
        [9, 4, 6],
        timber,
      );
      for (const side of [-1, 1]) {
        const roof = shape(
          this.root,
          "box",
          "Snow covered pitched roof",
          [x + side * 2.7, h + 5, z],
          [6.1, 0.3, 7.5],
          this.snow,
        );
        roof.setEulerAngles(0, 0, side * -24);
      }
      for (let i = -1; i <= 1; i++)
        shape(
          this.root,
          "box",
          "Chalet window",
          [x + i * 2.5, h + 2.5, z - 3.02],
          [1.5, 1.35, 0.05],
          glass,
        );
    }
    const board = this.sign(
      "ALPINE SKI PRO  /  FIND YOUR LINE",
      8,
      1.2,
      "#ee5c3a",
    );
    for (const z of [50, 160, 300, this.course.length - 30]) {
      const x = this.course.width / 2 + 1.5,
        h = terrainHeight(x, z, this.course);
      const e = shape(
        this.root,
        "box",
        "Trackside sponsor",
        [x, h + 0.8, z],
        [0.12, 1.3, 9],
        board.m,
      );
      e.render!.castShadows = false;
    }
    // Small original spectator silhouettes are peripheral scenery, not the player model.
    for (let i = 0; i < 18; i++) {
      const z = this.course.length - 14 + i * 1.8,
        x = (i % 2 ? -1 : 1) * (this.course.width / 2 + 2),
        h = terrainHeight(x, z, this.course);
      const jacket = i % 3 === 0 ? this.red : this.dark;
      shape(
        this.root,
        "capsule",
        "Spectator coat",
        [x, h + 0.95, z],
        [0.45, 0.95, 0.4],
        jacket,
      );
      shape(
        this.root,
        "sphere",
        "Spectator hat",
        [x, h + 1.58, z],
        [0.28, 0.3, 0.28],
        jacket,
      );
    }
  }
  finishArena() {
    const z = this.course.length,
      c = this.course;
    const steel = this.mat("Arena aluminium", "#596e7a", 0.65, 0.5),
      seats = this.mat("Arena seat red", "#bd2833"),
      screen = this.mat("Timing display", "#071b27", 0.15, 0.2);
    for (const side of [-1, 1]) {
      const x = side * (c.width / 2 + 8),
        y = terrainHeight(x, z, c);
      for (let tier = 0; tier < 4; tier++) {
        const terrace = shape(
          this.root,
          "box",
          "Grandstand terrace",
          [x + side * tier * 1.2, y + tier * 0.65 + 0.35, z],
          [1.4, 0.28, 20],
          steel,
        );
        terrace.setEulerAngles(
          (-Math.atan(gradient(x, z, c)[1]) * 180) / Math.PI,
          0,
          0,
        );
        for (let row = 0; row < 12; row++) {
          const zz = z - 9 + row * 1.55,
            xx = x + side * tier * 1.2,
            yy = terrainHeight(x, zz, c) + tier * 0.65 + 0.9;
          shape(
            this.root,
            "box",
            "Grandstand seat",
            [xx, yy - 0.25, zz],
            [0.6, 0.12, 0.58],
            seats,
          );
          if ((row + tier) % 3 !== 0) {
            const coat = (row + tier) % 2 ? this.dark : this.red;
            shape(
              this.root,
              "capsule",
              "Supporter",
              [xx, yy + 0.3, zz],
              [0.36, 0.72, 0.38],
              coat,
            );
            shape(
              this.root,
              "sphere",
              "Supporter winter hat",
              [xx, yy + 0.86, zz],
              [0.25, 0.27, 0.25],
              coat,
            );
          }
        }
      }
      const banner = this.sign(
        "ALPINE SKI PRO   /   RACE SERIES",
        20,
        1,
        "#ce2a2e",
      );
      shape(
        this.root,
        "box",
        "Red finish barrier",
        [
          side * (c.width / 2 + 0.3),
          terrainHeight((side * c.width) / 2, z + 5, c) + 0.75,
          z + 5,
        ],
        [0.18, 1.2, 32],
        banner.m,
      );
      for (const zz of [z - 25, z + 25]) {
        const xx = side * (c.width / 2 + 4),
          h = terrainHeight(xx, zz, c);
        shape(
          this.root,
          "cylinder",
          "Flag mast",
          [xx, h + 4, zz],
          [0.08, 8, 0.08],
          steel,
        );
        shape(
          this.root,
          "box",
          "Vertical race banner",
          [xx + side * 0.5, h + 5, zz],
          [1.2, 3.2, 0.04],
          this.red,
        );
      }
    }
    const bx = -c.width / 2 - 7,
      bz = z + 35,
      by = terrainHeight(bx, bz, c);
    const backdrop = this.sign("ALPINE SKI PRO   /   LEADER", 8, 3, "#cf292d");
    shape(
      this.root,
      "box",
      "Leader backdrop",
      [bx, by + 2, bz],
      [8, 3.5, 0.3],
      backdrop.m,
    );
    shape(
      this.root,
      "box",
      "Leader podium",
      [bx, by + 0.25, bz - 2],
      [5, 0.5, 3],
      this.dark,
    );
    shape(
      this.root,
      "box",
      "Red leader chair seat",
      [bx, by + 1, bz - 2],
      [1, 0.25, 1],
      this.red,
    );
    shape(
      this.root,
      "box",
      "Red leader chair back",
      [bx, by + 1.65, bz - 1.6],
      [1, 1.2, 0.2],
      this.red,
    );
    const tx = c.width / 2 + 7,
      tz = z + 18,
      ty = terrainHeight(tx, tz, c);
    shape(
      this.root,
      "box",
      "Timing screen frame",
      [tx, ty + 4, tz],
      [6, 3, 0.4],
      screen,
    );
    const label = this.sign("FINISH   /   ALPINE SKI PRO", 5.7, 2.6, "#102e3e");
    this.timingSign = label;
    shape(
      this.root,
      "box",
      "Timing board",
      [tx, ty + 4, tz - 0.22],
      [5.7, 2.6, 0.04],
      label.m,
    );
    for (const dx of [-2, 2])
      shape(
        this.root,
        "cylinder",
        "Screen support",
        [tx + dx, ty + 1.5, tz],
        [0.18, 3, 0.18],
        steel,
      );
    for (const x of [-5, 5]) {
      const zz = z + 47,
        h = terrainHeight(x, zz, c);
      shape(
        this.root,
        "box",
        "Finish timing hut",
        [x, h + 1.5, zz],
        [3, 3, 3],
        this.dark,
      );
      const roof = shape(
        this.root,
        "cone",
        "Race tent canopy",
        [x, h + 3.7, zz],
        [5, 1.6, 5],
        this.red,
      );
      roof.setEulerAngles(0, 45, 0);
    }
    // Ground-level crossed flags identify the exact timing beam.
    const h = terrainHeight(0, z, c);
    for (const x of [-7, 7])
      shape(
        this.root,
        "box",
        "Timing photocell",
        [x, h + 0.45, z],
        [0.22, 0.22, 0.22],
        this.dark,
      );
  }

  lift() {
    const x = -this.course.width / 2 - 30;
    const steel = this.mat("Lift steel", "#4b626c", 0.7, 0.5);
    let previous: pc.Vec3 | undefined;
    for (let z = -50; z < this.course.length + 90; z += 130) {
      const h = terrainHeight(x, z, this.course);
      shape(
        this.root,
        "cylinder",
        "Lift pylon",
        [x, h + 6, z],
        [0.45, 12, 0.45],
        steel,
      );
      shape(
        this.root,
        "box",
        "Lift cross arm",
        [x, h + 12, z],
        [5, 0.3, 0.45],
        steel,
      );
      const top = new pc.Vec3(x + 2, h + 12, z);
      if (previous) {
        beam(this.root, previous, top, 0.035, steel, "Lift cable");
        const c = previous.clone().lerp(previous, top, 0.5);
        beam(this.root, c, c.clone().add(new pc.Vec3(0, -2, 0)), 0.06, steel);
        shape(
          this.root,
          "box",
          "Chairlift seat",
          [c.x, c.y - 2, c.z],
          [2, 0.18, 0.7],
          this.dark,
        );
      }
      previous = top;
    }
  }
  updateTiming(time: number, missed: number) {
    if (!this.timingSign) return;
    const text = formatTime(time) + (missed ? "  DSQ" : "");
    if (text === this.timingLabel) return;
    this.timingLabel = text;
    const { canvas, texture } = this.timingSign,
      ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#102634";
    ctx.fillRect(0, 0, 1024, 192);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f37955";
    ctx.font = "24px sans-serif";
    ctx.fillText("ALPINE SKI PRO  /  LIVE TIMING", 512, 38);
    ctx.font = "bold 108px monospace";
    ctx.fillStyle = missed ? "#ff9e89" : "#e5fff5";
    ctx.fillText(text, 512, 151);
    texture.upload();
  }

  updateGates(status: string[], poles: PoleState[], dt = 1 / 60) {
    this.gateVisualTime += Math.min(0.05, Math.max(0, dt));
    this.gateEntities.forEach((g, i) => {
      const hinges = g.children.filter((p) => p.name === "Pole hinge");
      hinges.forEach((hinge, j) => {
        const p = poles[i * 2 + j];
        if (p) {
          hinge.setLocalEulerAngles(
            (p.angleX * 180) / Math.PI,
            0,
            (p.angleZ * 180) / Math.PI,
          );
          // A faster, lighter top section recoils after the lower hinge.
          // No per-frame mesh allocations and only one extra primitive per pole.
          const elasticTip = hinge.children.find(
            (e) => e.name === "Pole elastic upper section",
          );
          if (elasticTip) elasticTip.setLocalEulerAngles(
            ((p.angleX * 0.24 + p.omegaX * 0.022 +
              tipVibration(p) * 0.65) * 180) / Math.PI,
            0,
            ((p.angleZ * 0.24 + p.omegaZ * 0.022 +
              tipVibration(p) * 0.35) * 180) / Math.PI,
          );
          const cloth = hinge.children.find((e) => e.name === "Gate textile flag");
          if (cloth)
            cloth.setLocalEulerAngles(
              0,
              gateFlagFlutter(this.gateVisualTime + i * 0.37,
                p.angleX, p.omegaX),
              0,
            );
        }
      });
      if (status[i] === "passed") g.tags.add("passed");
    });
  }
  destroy() {
    this.root.destroy();
    this.resources.forEach((t) => t.destroy());
    this.materials.forEach((m) => m.destroy());
  }
}
export function configureWeather(
  app: pc.Application,
  camera: pc.Entity,
  weather: Weather,
) {
  const clear = weather === "clear";
  const sky = clear ? "#8db5ce" : weather === "snow" ? "#bcccd6" : "#a8bbc9";
  camera.camera!.clearColor = color(sky);
  app.scene.fog.type = pc.FOG_LINEAR;
  app.scene.fog.color = color(sky);
  app.scene.fog.start = clear ? 150 : 35;
  app.scene.fog.end = clear ? 1100 : weather === "snow" ? 260 : 600;
}
