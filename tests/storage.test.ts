import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { Progress } from "../src/game/storage";
import { readSettings, writeSettings } from "../src/game/settings";
import type { Result } from "../src/game/types";
let map: Map<string, string>;
beforeEach(() => {
  map = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());
const result = (time: number, valid = true): Result => ({
  time,
  valid,
  missed: valid ? 0 : 1,
  splits: [],
  course: "SG",
  equipment: "SG",
  date: "2026-11-15T21:00:00Z",
});
it("only records valid finite performances and keeps the best ghost across reloads", () => {
  const p = new Progress();
  expect(p.record(result(52), [])).toBe(true);
  expect(p.record(result(60), [])).toBe(false);
  expect(p.record(result(20, false), [])).toBe(false);
  expect(p.record(result(NaN), [])).toBe(false);
  const reload = new Progress();
  expect(reload.data.records.SG?.map((r) => r.time)).toEqual([52, 60]);
  expect(reload.data.ghosts.SG?.time).toBe(52);
  expect(reload.data.completed).toBe(2);
});
it("recovers from malformed saved data without preventing a later valid save", () => {
  map.set("alpine-ski-pro:v1", "{broken");
  const p = new Progress();
  expect(p.data.completed).toBe(0);
  p.record(result(48), []);
  expect(p.available).toBe(true);
  expect(new Progress().data.completed).toBe(1);
});
it("retains Glacier Express careers without importing an incompatible Cortina ghost", () => {
  map.set("alpine-ski-pro:v1", JSON.stringify({
    version: 1, name: "Racer", xp: 820, completed: 4,
    records: { SG: [result(44)] },
    ghosts: { SG: { time: 44, frames: [] } },
  }));
  const first = new Progress();
  expect(first.data.name).toBe("Racer");
  expect(first.data.xp).toBe(820);
  expect(first.data.completed).toBe(4);
  expect(first.data.records.SG ?? []).toEqual([]);
  expect(first.data.ghosts.SG).toBeUndefined();
  first.record(result(78), []);
  expect(new Progress().data.records.SG?.map(r => r.time)).toEqual([78]);
  // The old course's localStorage entry is never overwritten.
  expect(JSON.parse(map.get("alpine-ski-pro:v1")!).ghosts.SG.time).toBe(44);
});

it("rejects malformed graphics preferences and persists supported choices", () => {
  map.set(
    "alpine-ski-pro:settings:v1",
    JSON.stringify({ quality: "extreme", suit: "<script>", sound: "false" }),
  );
  const s = readSettings();
  expect(s.quality).toBe("high");
  expect(s.sound).toBe(true);
  expect(s.suit).toMatch(/^#[a-f0-9]{6}$/);
  s.quality = "low";
  s.sound = false;
  writeSettings(s);
  expect(readSettings().quality).toBe("low");
  expect(readSettings().sound).toBe(false);
});
it("keeps the game usable when browser storage is blocked", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  });
  const p = new Progress();
  expect(() => p.record(result(50), [])).not.toThrow();
  expect(p.available).toBe(false);
  expect(readSettings().course).toBe("SG");
});

it('archives the old 34-gate Cortina times while carrying the career into 42 gates', () => {
  const key='alpine-ski-pro:cortina-2026:v1';
  const old=JSON.stringify({version:1,name:'Cortina racer',xp:500,completed:3,
    records:{SG:[result(73)]},ghosts:{SG:{time:73,frames:[]}}});
  map.set(key,old);
  const current=new Progress();
  expect(current.data.xp).toBe(500);
  expect(current.data.name).toBe('Cortina racer');
  expect(current.data.records.SG).toEqual([]);
  expect(current.data.ghosts.SG).toBeUndefined();
  current.record(result(90),[]);
  expect(map.get(key)).toBe(old);
  expect(new Progress().data.records.SG?.[0].time).toBe(90);
});
