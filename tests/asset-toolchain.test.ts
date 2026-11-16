import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

function node(...args: string[]) {
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 15000,
  });
}
describe("verified 3D asset production toolkit", () => {
  it("parses all account-free tool scripts", () => {
    for (const path of [
      "scripts/asset_search.mjs",
      "scripts/asset_audit.mjs",
      "scripts/asset_tools.mjs",
    ]) {
      const result = node("--check", path);
      expect(result.status, path + ": " + result.stderr).toBe(0);
    }
  });
  it("refuses an empty or unapproved asset search without network calls", () => {
    const empty = node("scripts/asset_search.mjs");
    expect(empty.status).toBe(2);
    expect(empty.stderr).toContain("Usage:");
    const invalid = node("scripts/asset_search.mjs", "snow", "--type", "unknown");
    expect(invalid.status).toBe(2);
  });
  it("audits known GLBs and documents provenance", () => {
    const checked = node("scripts/asset_audit.mjs", "--json");
    expect(checked.status, checked.stderr).toBe(0);
    const report = JSON.parse(checked.stdout);
    expect(report.errors).toEqual([]);
    expect(report.scanned.some((entry: {path: string}) =>
      entry.path === "public/assets/skier.glb")).toBe(true);
    expect(readFileSync("docs/RESOURCE_CATALOG.md", "utf8"))
      .toContain("ambientCG");
    expect(readFileSync("docs/ASSET_WORKFLOW.md", "utf8"))
      .toContain("Blender");
  });
});
