import * as pc from "playcanvas";
import { formatTime } from "../game/race";
import { AlpineAssets } from "./alpine-assets";
import { terrainHeight, gradient, courseCenterX } from "../game/course";
import { trainingLineX } from "../game/guide";
import { sampleSnowSurface } from "../game/surface";
import { snowTexel } from "./snow-texture";
import { graniteTexel } from "./studio-rock-texel";
import { gatePoleCanvas, gateBannerCanvas } from "./gate-textures";
import { gateFlagFlutter } from "../game/gates-visual";
import { tipVibration, type PoleState } from "../game/poles";
import { SUPER_G_ROLLERS, superGSector } from "../game/superg";
import { ALPINE_START_GATE } from "../game/start-gate";
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
  blueBorderDye = false;
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
    if (this.course.id === "SG") this.superGScenery();
    this.gates();
    if (this.course.id === "SG") {
      this.superGMarkers();
      this.superGBlueDye();
    }
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
        // Edge weathering must follow the actual winding race corridor.
        // The older shading field remained at x=0 while the Super-G swung
        // almost 25m to each side, making groomed/powder borders misalign.
        const localX = x - courseCenterX(z, this.course);
        const edge = Math.min(
          1,
          Math.max(0, (Math.abs(localX) - this.course.width / 2) / 20),
        );
        // More exposed blue ice above the tree line and cooler hardpack in
        // the rocky canyon, without changing friction or course geometry.
        const region = this.course.id === "SG" ? superGSector(z) : "spruce";
        const glacierTint = region === "glacier" ? 0.038 : 0;
        const canyonTint = region === "canyon" ? 0.016 : 0;
        const n =
          Math.sin(x * 1.2 + z * 0.38) * Math.sin(z * 0.63 + x * 0.2) * 0.018;
        // Broad, subtle blue-grey compressed patches match the grip field.
        const icy = sampleSnowSurface(x, z, this.course).ice;
        col.push(
          1 - edge * 0.11 + n - icy * 0.075 - glacierTint - canyonTint,
          1 - edge * 0.075 + n - icy * 0.036 - canyonTint * 0.55,
          1 - edge * 0.04 + n - icy * 0.012 + glacierTint * 0.25,
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
            x = courseCenterX(z, this.course) + side * (120 + i * 19);
          const base = terrainHeight(courseCenterX(z, this.course) +
            side * 120, z, this.course);
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
      const z = -50 + random() * (this.course.length + 140);
      const section = this.course.id === "SG" ? superGSector(z) : "spruce";
      // Evergreen woodland, exposed glacier, then steeper mixed forest.
      // The tree mesh stays fully batched and changes NO draw calls.
      const density = section === "glacier" ? 0.18 :
        section === "canyon" ? 0.58 : section === "finish" ? 0.38 : 1;
      if (random() > density) continue;
      const x = courseCenterX(z, this.course) +
        (t % 2 ? 1 : -1) * (this.course.width / 2 +
          (this.alpineAssets?.has("fir") ? 39 : 6) + random() * 75);
      const y = terrainHeight(x, z, this.course);
      const h = (section === "glacier" ? 3 : 4) +
        random() * (section === "canyon" ? 12 : 8);
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

  /** Area-specific, fully batched rock geometry. Unlike repetitive cones,
   * every sector has separate density, silhouettes, exposed granite and
   * frost colour, with the glacier intentionally almost treeless. */
  /** The Studio Kit granite/slate recipe is applied only to newly
   * generated near-piste rock faces. Shared texture triplet, one batched
   * material and real UV/tangents; no new draw call per individual boulder. */
  studioRockPbr(material: pc.StandardMaterial) {
    const size = this.quality === "low" ? 128 : 256;
    const canvases = Array.from({length:3}, () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      return c;
    });
    const pixels = canvases.map(c => c.getContext("2d")!.createImageData(size,size));
    for(let y=0;y<size;y++)
      for(let x=0;x<size;x++) {
        const t=graniteTexel(x,y), i=(y*size+x)*4;
        const vectors=[t.diffuse,t.normal,
          [t.roughness,t.roughness,t.roughness]] as const;
        for(let k=0;k<3;k++) {
          const data=pixels[k].data;
          data[i]=vectors[k][0];data[i+1]=vectors[k][1];
          data[i+2]=vectors[k][2];data[i+3]=255;
        }
      }
    canvases.forEach((canvas,i)=>
      canvas.getContext("2d")!.putImageData(pixels[i],0,0));
    const tex=(c: HTMLCanvasElement,name:string)=>{
      const t=new pc.Texture(this.app.graphicsDevice,{name,mipmaps:true});
      t.setSource(c);
      t.addressU=t.addressV=pc.ADDRESS_REPEAT;
      t.anisotropy=4;
      this.resources.push(t);
      return t;
    };
    material.diffuseMap=tex(canvases[0],"Studio Kit original granite albedo");
    material.normalMap=tex(canvases[1],"Studio Kit original granite normal");
    material.glossMap=tex(canvases[2],"Studio Kit original granite roughness");
    material.glossMapChannel="r";
    material.glossInvert=true;
    material.gloss=1;
    material.bumpiness=.34;
    material.update();
  }

  superGScenery() {
    const random = rng(17122026);
    const vertices: number[] = [], indices: number[] = [],
      colors: number[] = [], uv: number[] = [];
    const count = {
      low: 88, medium: 155, high: 260, ultra: 370,
    }[this.quality];
    const addRock = (x: number, z: number, radius: number, altitude: number,
      tint: number) => {
      const n = vertices.length / 3;
      const y = terrainHeight(x, z, this.course);
      const sides = 7;
      vertices.push(x, y + altitude, z);
      colors.push(tint * 0.78, tint * 0.86, tint * 0.91, 1);
      uv.push(.5,.5);
      const rotation = random() * Math.PI * 2;
      for (let k = 0; k < sides; k++) {
        const a = k * Math.PI * 2 / sides;
        const rough = 0.7 + random() * 0.6;
        vertices.push(x + Math.cos(a) * radius * rough,
          y + (random() - 0.35) * radius * 0.4,
          z + Math.sin(a) * radius * rough);
        const shade = tint * (0.5 + random() * 0.37);
        colors.push(shade * 0.79, shade * 0.86, shade * 0.91, 1);
        uv.push(.5 + .47 * Math.cos(a + rotation),
          .5 + .47 * Math.sin(a + rotation));
      }
      for(let k=0;k<sides;k++)
        indices.push(n, n + 1 + k, n + 1 + ((k + 1) % sides));
    };
    for (let i = 0; i < count; i++) {
      const z = 90 + random() * (this.course.length - 140);
      const sector = superGSector(z);
      const side = i % 2 ? 1 : -1;
      const shoulder = this.course.width / 2;
      const distance = shoulder + 8 + random() *
        (sector === "glacier" ? 66 : 48);
      const x = courseCenterX(z, this.course) + side * distance;
      const radius = (sector === "glacier" ? 3.8 :
        sector === "canyon" ? 3 : 1.8) * (0.6 + random() * 1.1);
      const height = radius * (sector === "glacier" ? 2.3 : 1.3);
      addRock(x, z, radius, height,
        sector === "glacier" ? 0.79 : sector === "canyon" ? 0.63 : 0.76);
    }
    const granite = this.mat("Batched rock faces and glacier moraine", "#ffffff");
    granite.diffuseVertexColor = true;
    this.studioRockPbr(granite);
    const mesh = meshEntity(this.app.graphicsDevice, this.root,
      "Terrain sector granite and moraine", vertices, indices, granite, colors, uv);
    mesh.render!.castShadows = this.quality !== "low";
    const signs: { z: number; text: string; tone: string }[] = [
      { z: 400, text: "FORET DES AIGUILLES", tone: "#245b49" },
      { z: 850, text: "GLACIER / 110 KM H", tone: "#477a99" },
      { z: 1260, text: "COMBE DU ROC", tone: "#465968" },
      { z: 1725, text: "SPRINT FINAL", tone: "#b52937" },
    ];
    for (const signInfo of signs) {
      const z = signInfo.z;
      const x = courseCenterX(z, this.course) +
        this.course.width / 2 + 3.6;
      const base = terrainHeight(x, z, this.course);
      const panel = this.sign(signInfo.text, 5.3, 0.7, signInfo.tone);
      shape(this.root, "box", "Super-G sector sign",
        [x, base + 2.3, z], [5.3, 0.76, 0.16], panel.m);
      shape(this.root, "cylinder", "Sector sign support",
        [x, base + 1.0, z], [0.075, 2.0, 0.075], this.dark);
    }
  }

  /** Original curved textile panel: thin woven fabric rather than a
   * rectangular box. Tessellation and seam shading are baked once, with
   * shared 1024px textile materials; hinges retain elastic pole movement. */
  fabricFlag(parent: pc.Entity, side: number, textile: pc.StandardMaterial) {
    const p: number[] = [], uv: number[] = [], idx: number[] = [];
    const nx = 8, ny = 4, width = 0.79, height = 0.5;
    for (let y = 0; y <= ny; y++)
      for (let x = 0; x <= nx; x++) {
        const u = x / nx, v = y / ny;
        const fold = 0.040 * Math.sin(u * Math.PI) *
          Math.sin(v * Math.PI * 1.65) +
          0.012 * Math.sin(u * Math.PI * 4 + v * Math.PI);
        p.push(side * width * u, 1.20 + height * v,
          -0.08 + fold);
        uv.push(u, 1 - v);
      }
    for(let y=0;y<ny;y++)
      for(let x=0;x<nx;x++) {
        const a = y * (nx+1) + x, b = a + nx + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const flag = meshEntity(this.app.graphicsDevice, parent,
      "Gate textile flag", p, idx, textile, undefined, uv);
    flag.render!.castShadows = false;
    return flag;
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
          this.fabricFlag(pivot, side, textile);
        }
      }
      this.gateEntities.push(parent);
    }
    if (this.course.id === "SG") this.superGStartBooth();
    else this.arch(3, "DÉPART", false);
    this.arch(this.course.length, "ARRIVÉE", true);
  }

  /** V1.11: enclosed mountain timing cabin with a single mechanical wand.
   * All meshes/textures are project originals, not any championship's branding.
   * Roof and walls track the sampled slope instead of resting on a flat slab. */
  superGStartBooth() {
    const root = new pc.Entity("Super-G competition start house");
    this.root.addChild(root);
    this.startBooth = root;
    const h = (x: number, z: number) => terrainHeight(x, z, this.course);
    const timber = this.mat("PBR fir board cladding", "#e1cbb4", 0, 0.20);
    const steel = this.mat("Brushed start-timing steel", "#728993", 0.78, 0.54);
    const rubber = this.mat("Black shock-absorbing race padding", "#20292c", 0.03, 0.12);
    const fabric = this.mat("Weatherproof competition tarpaulin", "#26476a", 0, 0.30);
    const roofMetal = this.mat("Dark matt roof seams", "#35434c", 0.55, 0.25);
    const signal = this.mat("Timing status amber LED", "#f4b94a", 0, 0.50);
    signal.emissive.set(0.65, 0.32, 0.04); signal.update();
    const panel = this.mat("Original race blue line", "#2b9bbd", 0, 0.34);

    // One reusable, authored timber grain instead of flat coloured cubes.
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#736252"; ctx.fillRect(0,0,256,256);
    for (let x=0; x<256; x+=32) {
      ctx.fillStyle = x % 64 ? "#887665" : "#796858";
      ctx.fillRect(x+2,0,29,256);
      ctx.fillStyle = "#3d3630";ctx.fillRect(x,0,2,256);
      for(let i=0;i<26;i++) {
        const xx=x+3+((i*17)%24), yy=(i*39+x*3)%256;
        ctx.fillStyle=i%3 ? "rgba(234,211,179,.14)" : "rgba(29,22,18,.15)";
        ctx.fillRect(xx,yy,1,11+(i%5)*6);
      }
      for(const yy of [34,215]) {
        ctx.fillStyle="#3b3834";ctx.fillRect(x+6,yy,3,3);
      }
    }
    const woodMap = new pc.Texture(this.app.graphicsDevice,{name:"Original competition timber grain albedo",mipmaps:true});
    woodMap.setSource(c);
    woodMap.addressU = woodMap.addressV = pc.ADDRESS_REPEAT;
    woodMap.anisotropy = 4;
    this.resources.push(woodMap);
    timber.diffuseMap = woodMap;
    timber.update();

    // Wall quads combine into a single triangulated cladding mesh.
    const p:number[]=[],uv:number[]=[],tri:number[]=[];
    const quad=(a:number[],b:number[],d:number[],e:number[],repeatU=1,repeatV=1)=>{
      const i=p.length/3;
      p.push(...a,...b,...d,...e);
      uv.push(0,0,repeatU,0,repeatU,repeatV,0,repeatV);
      tri.push(i,i+1,i+2,i,i+2,i+3,
        i,i+2,i+1,i,i+3,i+2);
    };
    // Sides and back CLOSED; front stays open for a 2.2 m race corridor.
    for(const side of [-1,1]) for(let z=-4.5;z<4.25;z+=1.75) {
      const next=Math.min(4.25,z+1.75);
      const x=side*2.48;
      quad([x,h(x,z)-.12,z],[x,h(x,next)-.12,next],
        [x,h(x,next)+2.95,next],[x,h(x,z)+2.95,z],1.4,3.2);
    }
    for(let x=-2.48;x<2.48;x+=.62) {
      const next=Math.min(2.48,x+.62), z=-4.50;
      quad([x,h(x,z)-.15,z],[next,h(next,z)-.15,z],
        [next,h(next,z)+2.95,z],[x,h(x,z)+2.95,z],.6,3.3);
    }
    const walls=meshEntity(this.app.graphicsDevice,root,"Closed start cabin textured timber wall",p,tri,timber,undefined,uv);
    walls.render!.castShadows=this.quality!=="low";

    // Sloped, double-pitched roof: actual mesh triangles, not two large boxes.
    const roofP:number[]=[],roofUV:number[]=[],roofT:number[]=[];
    for(let i=0;i<=10;i++) {
      const z=-5.05+i*.99;
      const base=h(0,z);
      for(const x of [-2.92,0,2.92]) {
        roofP.push(x,base+(x===0?3.96:3.13),z);
        roofUV.push((x+2.92)/2.1,i*.48);
      }
      if(i) for(let k=0;k<2;k++) {
        const a=(i-1)*3+k,b=i*3+k;
        roofT.push(a,b,a+1,b,b+1,a+1,
          a,a+1,b,b,a+1,b+1);
      }
    }
    const roof=meshEntity(this.app.graphicsDevice,root,"Angled timber and snow start house roof",
      roofP,roofT,this.snow,undefined,roofUV);
    roof.render!.castShadows=this.quality!=="low";
    for(const side of [-1,1]) for(let z=-4.92;z<=4.85;z+=2.45) {
      const y=h(0,z)+3.12;
      beam(root,new pc.Vec3(side*2.88,y,z),new pc.Vec3(side*2.88,y-.15,z+.12),
        .055,roofMetal,"Metal standing seam roof");
    }

    // Genuine narrow launch bay; front columns and buffer pads flank the skis.
    const zFront=4.28;
    for(const side of [-1,1]) {
      const x=side*1.21,ground=h(x,zFront);
      shape(root,"cylinder","Cylindrical padded launch jamb",
        [x,ground+1.25,zFront],[.23,2.5,.23],rubber);
      shape(root,"cylinder","Start timber facade post",
        [side*2.5,h(side*2.5,zFront)+1.5,zFront],[.14,3.0,.14],steel);
      shape(root,"box","Slim front sponsor panel",
        [side*1.92,h(side*1.92,zFront)+1.84,zFront+.10],[1.20,2.17,.055],fabric);
      shape(root,"box","Front lower foam cushion",
        [side*1.52,h(side*1.52,zFront)+.5,zFront+.20],[.18,.82,.30],rubber);
      for(let z=-4.3;z<=3.5;z+=1.3) {
        const xOuter=side*2.48;
        shape(root,"cylinder","Cabin corner aluminum rivet",
          [xOuter-side*.012,h(xOuter,z)+2.45,z],[.035,.04,.035],steel);
      }
      beam(root,new pc.Vec3(side*2.45,h(side*2.45,-4.2)+2.96,-4.2),
        new pc.Vec3(side*.35,h(0,-4.2)+3.9,-4.2),.07,steel,
        "Triangulated roof bearing beam");
      // Side signage is original and sits over the wooden structural wall.
      const plate=this.sign(side<0?"ALPINE  /  RACE":"SPEED  /  SERIES",3.9,.54,"#233f59");
      const signEntity=shape(root,"box","Non-branded side sponsor sign",
        [side*2.51,h(side*2.51,0)+2.05,0],[.055,.55,3.90],plate.m);
      signEntity.render!.castShadows=false;
    }
    const top=this.sign("ALPINE SKI PRO   •   SUPER-G",4.75,.54,"#18364f");
    shape(root,"box","Competition race front fascia",
      [0,h(0,zFront)+3.06,zFront+.11],[4.76,.57,.12],top.m);
    shape(root,"box","Protected start marshal timing equipment",
      [-1.89,h(-1.89,3.70)+1.0,3.70],[.30,.40,.30],rubber);
    const ready=this.sign("READY   /   00",1.0,.36,"#152d38");
    shape(root,"box","Race start electronic timer",
      [-1.87,h(-1.87,3.7)+1.27,4.1],[1.0,.34,.06],ready.m);
    shape(root,"sphere","Tiny countdown status lamp",
      [-1.55,h(-1.55,3.7)+1.62,4.05],[.08,.08,.07],signal);

    // Two deep, compacted grooves aligned with the real ski base surfaces.
    const scuff=this.mat("Compacted launch ski grooves", "#9bafba",0,.12);
    const grooveP:number[]=[],grooveT:number[]=[];
    for(const side of [-1,1]) for(let i=0;i<30;i++) {
      const z=-3.55+i*.44,x=side*.16;
      const y=h(x,z)+.018+(i%5)*.001;
      const index=grooveP.length/3;
      grooveP.push(x-.043,y,z,x+.043,y,z,x-.043,y,z+.41,x+.043,y,z+.41);
      grooveT.push(index,index+2,index+1,index+1,index+2,index+3);
    }
    const marks=meshEntity(this.app.graphicsDevice,root,
      "Two compacted ski launch tracks",grooveP,grooveT,scuff);
    marks.render!.castShadows=false;
    // Single FIS-dimensioned wand with exposed hinge, switch, and cable.
    const gate=ALPINE_START_GATE;
    const supportX=gate.postX,supportY=h(supportX,gate.z)+gate.height;
    shape(root,"cylinder","Start gate protected steel mounting post",
      [supportX,supportY*.5,gate.z],[.068,2*supportY-.09,.068],steel);
    const hinge=new pc.Entity("FIS single start wand hinge");
    hinge.setLocalPosition(supportX,supportY,gate.z);
    root.addChild(hinge);
    this.startWands.push(hinge);
    shape(hinge,"cylinder","Compact mechanical timing pivot",
      [0,0,0],[.125,.135,.125],rubber);
    shape(hinge,"cylinder","One low athlete-contact timing bar",
      [-gate.wandLength*.5,0,0],[.035,gate.wandLength,.035],steel)
      .setLocalEulerAngles(0,0,90);
    shape(hinge,"sphere","Sealed rounded timing bar end",
      [-gate.wandLength,0,0],[.065,.045,.045],rubber);
    shape(root,"box","Sealed start microswitch housing",
      [supportX+.14,supportY+.08,gate.z],[.24,.17,.24],rubber);
    beam(root,new pc.Vec3(supportX+.15,supportY+.04,gate.z-.1),
      new pc.Vec3(supportX+.27,h(supportX,gate.z)+.06,gate.z-.5),
      .015,rubber,"Covered timing cable");
    this.startWands[0].setLocalEulerAngles(0,0,0);
  }

  /** The mechanical single wand opens on shin contact and stays open until
   * the next launch. The trigger time is resolved independently at 120 Hz. */
  updateStartWands(gateAngle = 0, dt = 1/60) {
    const hinge=this.startWands[0];
    if(!hinge) return;
    const target=Math.max(0,Math.min(ALPINE_START_GATE.maximumAngle,gateAngle));
    const previous=hinge.getLocalEulerAngles().y;
    // Fast opening when pushed, slower positioning when a new run is reset.
    const response=target>previous?35:8;
    const blend=1-Math.exp(-Math.max(0,Math.min(dt,.1))*response);
    hinge.setLocalEulerAngles(0,previous+(target-previous)*blend,0);
  }

  /** Blue terrain marks on the approach to the five speed crests.
   * One batched geometry, no expensive per-frame decal updates. */

  /** World Cup-inspired blue-dye lane: BOTH curving side markers and short
   * crossing bars at compressions/crests. Painted on the real sampled terrain.
   * A single batched mesh, rather than hundreds of draw calls. */
  /** FIS-inspired original blue marking: chalk-like sprayed lines placed
   * inside the piste, beside gates and transversally before jump lips.
   * All triangles are combined into one mesh / one dye material. */
  superGBlueDye() {
    this.blueBorderDye = true;
    const p: number[] = [], indices: number[] = [], uv: number[] = [];
    const addStroke = (
      ax: number, az: number, bx: number, bz: number, width: number,
    ) => {
      const dx = bx - ax, dz = bz - az;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      const nx = (dz / distance) * width / 2;
      const nz = (-dx / distance) * width / 2;
      const corners: [number, number][] = [
        [ax + nx, az + nz], [ax - nx, az - nz],
        [bx + nx, bz + nz], [bx - nx, bz - nz],
      ];
      const n = p.length / 3;
      for (const [x, z] of corners)
        p.push(x, terrainHeight(x, z, this.course) + 0.064, z);
      // Physical dye weave: 0.95m repeat, leaving fine atomized edges.
      uv.push(0, az / 0.95, 1, az / 0.95,
        0, az / 0.95 + distance / 0.95,
        1, az / 0.95 + distance / 0.95);
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    };
    // Two blue outlines follow the *curving* piste, with organic width
    // variations instead of mathematically-perfect fluorescent ribbons.
    for (let z = 0; z < this.course.length; z += 2.3) {
      const next = Math.min(this.course.length, z + 2.3);
      for (const side of [-1, 1]) {
        const offset = side * (this.course.width / 2 - 2.0);
        const wobble = (value: number) =>
          0.065 * Math.sin(value * 0.31 + side * 1.2) +
          0.045 * Math.sin(value * 0.89 + side * 2.3);
        const width = 0.24 +
          0.07 * (1 + Math.sin(z * 0.29 + side)) / 2;
        addStroke(
          courseCenterX(z, this.course) + offset + wobble(z), z,
          courseCenterX(next, this.course) + offset + wobble(next), next,
          width,
        );
      }
    }
    // Blue transverse terrain-awareness strips before crest / compression
    // and immediately around the takeoff, never on an unrelated straight.
    for (const roller of SUPER_G_ROLLERS) {
      for (const shift of [-24, -10, 8, 23]) {
        const z = roller.z + shift, cx = courseCenterX(z, this.course);
        for (let i = 0; i < 24; i++) {
          const x0 = cx - 17 + i * (34 / 24);
          addStroke(x0, z, x0 + 34 / 24, z,
            0.19 + 0.04 * Math.sin(i * 2.3));
        }
      }
    }
    // Parallel local guides on the outside of each gate, leading the
    // skier's eyes into a medium/long racing turn.
    for (const gate of this.course.gates) {
      for (const side of [-1, 1]) {
        const x = gate.x + side * (gate.width / 2 + 1.65);
        addStroke(x + side * 0.08, gate.z - 5.5,
          x - side * 0.08, gate.z + 3.5, 0.28);
      }
    }
    const source = document.createElement("canvas");
    source.width = source.height = 128;
    const ctx = source.getContext("2d")!;
    const img = ctx.createImageData(128, 128);
    const random = rng(20261119);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const a = (y * 128 + x) * 4;
        const edge = Math.min(1, Math.min(x, 127 - x) / 18);
        const speckle = random();
        const intensity = 0.78 + speckle * 0.22;
        img.data[a] = Math.round(37 * intensity);
        img.data[a + 1] = Math.round(116 * intensity);
        img.data[a + 2] = Math.round(194 * intensity);
        img.data[a + 3] = Math.round(
          (speckle < 0.065 ? 0.18 : 0.58 + speckle * 0.42) *
          (0.14 + edge * 0.86) * 232,
        );
      }
    ctx.putImageData(img, 0, 0);
    const texture = new pc.Texture(this.app.graphicsDevice, {
      name: "Original powder sprayed FIS-style blue dye", mipmaps: true,
    });
    texture.setSource(source);
    texture.addressU = texture.addressV = pc.ADDRESS_REPEAT;
    texture.anisotropy = 8;
    this.resources.push(texture);
    const material = this.mat("Atomized blue piste marking", "#ffffff", 0, 0.30);
    material.diffuseMap = texture;
    material.opacityMap = texture;
    material.opacityMapChannel = "a";
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
    material.cull = pc.CULLFACE_NONE;
    material.opacity = 0.91;
    material.update();
    const mesh = meshEntity(this.app.graphicsDevice, this.root,
      "FIS inspired sprayed blue piste edges gate approaches and jump lines",
      p, indices, material, undefined, uv);
    mesh.render!.castShadows = false;
  }

  superGMarkers() {
    const p: number[] = [], indices: number[] = [];
    for (const bump of SUPER_G_ROLLERS) {
      const z = bump.z - 14;
      for (let i = 0; i < 32; i++) {
        const x0 = courseCenterX(z, this.course) + (i / 32 - 0.5) * 27;
        const x1 = courseCenterX(z, this.course) + ((i + 1) / 32 - 0.5) * 27;
        const y0 = terrainHeight(x0, z, this.course) + 0.044;
        const y1 = terrainHeight(x1, z, this.course) + 0.044;
        const n = p.length / 3;
        p.push(x0, y0, z, x1, y1, z,
          x1, terrainHeight(x1, z + 0.21, this.course) + 0.044, z + 0.21,
          x0, terrainHeight(x0, z + 0.21, this.course) + 0.044, z + 0.21);
        indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
      }
      const x = courseCenterX(z, this.course) - this.course.width / 2 - 3;
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
      for (let z = 0; z < this.course.length + 30; z += 6) {
        const x = courseCenterX(z, this.course) +
          side * this.course.width / 2;
        const nextX = courseCenterX(z + 6, this.course) +
          side * this.course.width / 2;
        const a = terrainHeight(x, z, this.course);
        const b = terrainHeight(nextX, z + 6, this.course);
        for (let y = 0.25; y <= 1.25; y += 0.25)
          quad([x, a + y, z], [nextX, b + y, z + 6], 0.025);
        // Flexible safety net strands trace the serpentine piste, not x=const.
        for (let dz = 0; dz < 6; dz += 0.75) {
          const xx = courseCenterX(z + dz, this.course) +
            side * this.course.width / 2;
          const y = terrainHeight(xx, z + dz, this.course);
          const n = p.length / 3;
          p.push(xx, y + 0.2, z + dz,
            xx, y + 1.3, z + dz,
            xx, y + 1.3, z + dz + 0.02,
            xx, y + 0.2, z + dz + 0.02);
          idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
        }
        if (z % 24 === 0)
          shape(this.root, "cylinder", "Net support",
            [x, a + 0.7, z], [0.06, 1.6, 0.06], this.red);
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
        [x, terrainHeight(x, z, c) + 0.44, z],
        [0.22, 0.22, 0.22],
        this.dark,
      );
    if (this.course.id === "SG") {
      const emitter = this.mat("Finish photocell indicator glass",
        "#65cbe9", 0.12, 0.86);
      const beamMat = this.mat("Subtle optical finish timing beam",
        "#66d9f6", 0, 0.62);
      beamMat.emissive.set(0.05, 0.17, 0.23);
      beamMat.opacity = 0.16;
      beamMat.blendType = pc.BLEND_NORMAL;
      beamMat.depthWrite = false;
      beamMat.update();
      // Secondary redundant beam housings, both at knee-level, with a
      // nearly invisible light indication across the finish corridor.
      for (const side of [-1, 1])
        for (const dz of [0, 0.32]) {
          const x = side * 6.6;
          const y = terrainHeight(x, z + dz, c);
          shape(this.root, "box", "SG twin photoelectric finish sensor",
            [x, y + 0.38, z + dz],
            [0.24, 0.19, 0.25], emitter);
        }
      for (let x = -6.3; x < 6.3; x += 0.7) {
        const y0 = terrainHeight(x, z, c) + 0.38;
        const y1 = terrainHeight(x + 0.7, z, c) + 0.38;
        const p = [x,y0,z, x+0.7,y1,z,
          x+0.7,y1+0.016,z, x,y0+0.016,z];
        const segment = meshEntity(this.app.graphicsDevice, this.root,
          "Low finish beam marker", p, [0,1,2,0,2,3], beamMat);
        segment.render!.castShadows = false;
      }
    }
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
