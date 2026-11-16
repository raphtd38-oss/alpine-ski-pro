import type { Discipline, Frame, Result } from "./types";
const KEY = "alpine-ski-pro:v1";
export interface Save {
  version: 1;
  name: string;
  xp: number;
  completed: number;
  records: Partial<Record<Discipline, Result[]>>;
  ghosts: Partial<Record<Discipline, { time: number; frames: Frame[] }>>;
}
const defaults = (): Save => ({
  version: 1,
  name: "Athlète",
  xp: 0,
  completed: 0,
  records: {},
  ghosts: {},
});
const disciplines = ["SL", "GS", "SG", "DH"];
const validResult = (r: Result) =>
  r &&
  r.valid === true &&
  Number.isFinite(r.time) &&
  r.time > 0 &&
  disciplines.includes(r.course) &&
  disciplines.includes(r.equipment) &&
  typeof r.date === "string" &&
  Array.isArray(r.splits);
export class Progress {
  data: Save = defaults();
  available = true;
  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.version === 1) {
          this.data.name =
            typeof d.name === "string" ? d.name.slice(0, 32) : "Athlète";
          this.data.xp = Number.isFinite(d.xp) ? Math.max(0, d.xp) : 0;
          this.data.completed = Number.isFinite(d.completed)
            ? Math.max(0, d.completed)
            : 0;
          for (const id of disciplines as Discipline[]) {
            this.data.records[id] = Array.isArray(d.records?.[id])
              ? d.records[id].filter(validResult).slice(0, 10)
              : [];
            const g = d.ghosts?.[id];
            if (
              g &&
              Number.isFinite(g.time) &&
              Array.isArray(g.frames) &&
              g.frames.length <= 30000 &&
              g.frames.every(
                (f: Frame) =>
                  f &&
                  (f.flex === undefined || Number.isFinite(f.flex)) &&
                  [
                    "t",
                    "x",
                    "z",
                    "heading",
                    "edge",
                    "height",
                    "tuck",
                    "fallen",
                  ].every((k) => Number.isFinite(f[k as keyof Frame])),
              )
            )
              this.data.ghosts[id] = g;
          }
        }
      }
    } catch {
      this.available = false;
    }
  }
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.available = true;
    } catch {
      this.available = false;
    }
  }
  record(r: Result, frames: Frame[]): boolean {
    if (!r.valid || !Number.isFinite(r.time) || r.time <= 0) return false;
    const records = this.data.records[r.course] ?? [];
    const best = records.length === 0 || r.time < records[0].time;
    this.data.records[r.course] = [...records, r]
      .sort((a, b) => a.time - b.time)
      .slice(0, 10);
    this.data.completed++;
    this.data.xp += 100 + (best ? 50 : 0);
    if (best)
      this.data.ghosts[r.course] = {
        time: r.time,
        frames: frames.slice(0, 30000),
      };
    this.save();
    return best;
  }
  get level() {
    return Math.floor(this.data.xp / 500) + 1;
  }
}
