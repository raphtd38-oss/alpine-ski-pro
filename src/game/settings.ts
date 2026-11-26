import type { Settings } from "../ui/ui";
const KEY = "alpine-ski-pro:settings:v1";
export function readSettings(): Settings {
  const result: Settings = {
    course: "SG",
    equipment: "SG",
    quality: "high",
    autoPerformance: true,
    weather: "clear",
    sound: true,
    ghost: true,
    edges: true,
    // Cortina reference: competition crimson (still fully customizable).
    suit: "#b71d38",
  };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!v || typeof v !== "object") return result;
    // Migrate older settings without activating the removed SL/GS/DH modes.
    result.course = "SG";
    result.equipment = "SG";
    if (["low", "medium", "high", "ultra"].includes(v.quality))
      result.quality = v.quality;
    if (["clear", "overcast", "snow"].includes(v.weather))
      result.weather = v.weather;
    for (const name of ["sound", "ghost", "edges", "autoPerformance"] as const)
      if (typeof v[name] === "boolean") result[name] = v[name];
    if (typeof v.suit === "string" && /^#[0-9a-f]{6}$/i.test(v.suit))
      result.suit = v.suit;
  } catch {
    /* Storage can be unavailable or contain an older malformed preference. */
  }
  return result;
}
export function writeSettings(value: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
