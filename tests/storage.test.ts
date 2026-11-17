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
