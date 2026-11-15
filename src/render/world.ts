import * as pc from "playcanvas";
import { terrainHeight } from "../game/course";
import type { PoleState } from "../game/poles";
import type { Course, Quality, Weather } from "../game/types";
import { material, meshEntity, shape, beam, rng, color } from "./geometry";
export class World {
  root = new pc.Entity("Alpine world");
  gateEntities: pc.Entity[] = [];
  resources: pc.Texture[] = [];
  materials: pc.StandardMaterial[] = [];
  snow: pc.StandardMaterial;
  red: pc.StandardMaterial;
  blue: pc.StandardMaterial;
  dark: pc.StandardMaterial;
  constructor(
    public app: pc.Application,
    public course: Course,
    public quality: Quality,
  ) {
    app.root.addChild(this.root);
    this.snow = this.mat("Crystalline snow", "#e8f1f5", 0.03, 0.32);
    this.snow.diffuseVertexColor = true;
    this.snow.update();
    this.red = this.mat("Race vermilion", "#f65135");
    this.blue = this.mat("Race cobalt", "#1679d8");
    this.dark = this.mat("Graphite", "#152b3a", 0.3, 0.35);
    this.snowTexture();
    this.terrain();
    this.mountains();
    this.forest();
    this.gates();
    this.fences();
    this.buildings();
    this.finishArena();
    this.lift();
  }
  mat(name: string, hex: string, metal = 0, gloss = 0.25) {
    const m = material(name, hex, metal, gloss);
    this.materials.push(m);
    return m;
  }
  snowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    const im = ctx.createImageData(512, 512),
      random = rng(19);
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 512; x++) {
        const v = 235 + random() * 20 - (x % 12 < 2 ? 12 : 0);
        const i = (y * 512 + x) * 4;
        im.data[i] = v;
        im.data[i + 1] = v + 2;
        im.data[i + 2] = v + 4;
        im.data[i + 3] = 255;
      }
    ctx.putImageData(im, 0, 0);
    const t = new pc.Texture(this.app.graphicsDevice, {
      name: "Original groomed snow",
      mipmaps: true,
    });
    t.setSource(c);
    t.addressU = t.addressV = pc.ADDRESS_REPEAT;
    t.anisotropy = 8;
    this.snow.diffuseMap = t;
    this.snow.diffuseMapTiling.set(1, 1);
    this.snow.update();
    this.resources.push(t);
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
        uv.push(x / 12, z / 12);
        const edge = Math.min(
          1,
          Math.max(0, (Math.abs(x) - this.course.width / 2) / 20),
        );
        const n =
          Math.sin(x * 1.2 + z * 0.38) * Math.sin(z * 0.63 + x * 0.2) * 0.018;
        col.push(
          1 - edge * 0.11 + n,
          1 - edge * 0.075 + n,
          1 - edge * 0.04 + n,
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
  mountains() {
    const mat = this.mat("Snow and granite massif", "#eef3f6");
    mat.diffuseVertexColor = true;
    mat.update();
    const random = rng(722);
    for (let side = -1; side <= 1; side += 2) {
      const p: number[] = [],
        idx: number[] = [],
        cols: number[] = [];
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
          if (side > 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
          else idx.push(a, a + 1, b, a + 1, b + 1, b);
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
    }
  }
  forest() {
    const random = rng(406);
    const p: number[] = [],
      idx: number[] = [],
      cols: number[] = [];
    const mat = this.mat("Snow-laden spruce", "#4c6e71");
    mat.diffuseVertexColor = true;
    mat.update();
    const count = { low: 130, medium: 250, high: 380, ultra: 600 }[
      this.quality
    ];
    for (let t = 0; t < count; t++) {
      const x = (t % 2 ? 1 : -1) * (this.course.width / 2 + 6 + random() * 75),
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
          const snow = k % 3 !== 0;
          cols.push(
            ...(snow
              ? [
                  0.72 + level * 0.025,
                  0.8 + level * 0.02,
                  0.84 + level * 0.02,
                  1,
                ]
              : [0.075, 0.18, 0.19, 1]),
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
      const m = g.id % 2 === 0 ? this.red : this.blue;
      for (const side of [-1, 1]) {
        const x = g.x + (side * g.width) / 2,
          h = terrainHeight(x, g.z, this.course);
        const pivot = new pc.Entity("Pole hinge");
        pivot.setLocalPosition(x, h, g.z);
        parent.addChild(pivot);
        const pole = shape(
          pivot,
          "cylinder",
          "Flexible slalom pole",
          [0, 1, 0],
          [0.035, 2, 0.035],
          m,
        );
        pole.tags.add("pole");
        if (this.course.id !== "SL") {
          const banner = shape(
            parent,
            "box",
            "Race flag",
            [x + side * 0.42, h + 1.4, g.z],
            [0.85, 0.6, 0.025],
            m,
          );
          banner.render!.castShadows = false;
        }
      }
      this.gateEntities.push(parent);
    }
    this.arch(3, "DÉPART", false);
    this.arch(this.course.length, "ARRIVÉE", true);
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
    return { m, width, height };
  }
  arch(z: number, label: string, finish: boolean) {
    const w = finish ? 14 : 7,
      h = terrainHeight(0, z, this.course);
    for (const x of [-w / 2, w / 2])
      shape(
        this.root,
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
      this.root,
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
          this.root,
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
        shape(
          this.root,
          "box",
          "Grandstand terrace",
          [x + side * tier * 1.2, y + tier * 0.65 + 0.35, z],
          [1.4, 0.28, 20],
          steel,
        );
        for (let row = 0; row < 12; row++) {
          const zz = z - 9 + row * 1.55,
            xx = x + side * tier * 1.2,
            yy = y + tier * 0.65 + 0.9;
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
  updateGates(status: string[], poles: PoleState[]) {
    this.gateEntities.forEach((g, i) => {
      const hinges = g.children.filter((p) => p.name === "Pole hinge");
      hinges.forEach((hinge, j) => {
        const p = poles[i * 2 + j];
        if (p)
          hinge.setLocalEulerAngles(
            (p.angleX * 180) / Math.PI,
            0,
            (p.angleZ * 180) / Math.PI,
          );
      });
      if (status[i] === "passed") g.tags.add("passed");
    });
  }
  destroy() {
    const meshes = new Set<pc.Mesh>();
    for (const r of this.root.findComponents("render") as pc.RenderComponent[])
      for (const mi of r.meshInstances) mi.mesh && meshes.add(mi.mesh);
    this.root.destroy();
    for (const mesh of meshes) if (mesh.refCount === 0) mesh.destroy();
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
