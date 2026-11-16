import { describe, expect, it } from "vitest";
import pack from "../scripts/alpine-pack.json";
import catalog from "../docs/RESOURCE_CATALOG.md?raw";
import workflow from "../docs/ASSET_WORKFLOW.md?raw";
import searchScript from "../scripts/asset_search.mjs?raw";
import auditScript from "../scripts/asset_audit.mjs?raw";
import toolsScript from "../scripts/asset_tools.mjs?raw";

describe("verified 3D asset production toolkit", () => {
  it("keeps a licence-aware catalogue and a reproducible workflow", () => {
    expect(catalog).toContain("Poly Haven");
    expect(catalog).toContain("ambientCG");
    expect(catalog).toContain("Mixamo");
    expect(catalog).toContain("KTX2");
    expect(workflow).toContain("Blender");
    expect(workflow).toContain("assets:audit");
  });
  it("uses account-free official research APIs and requires user agent", () => {
    expect(searchScript).toContain("https://api.polyhaven.com/assets");
    expect(searchScript).toContain("https://ambientcg.com/api/v3/assets");
    expect(searchScript).toContain("User-Agent");
    expect(searchScript).toContain("CC0-1.0");
  });
  it("audits the approved alpine pack and does not silently overwrite models", () => {
    expect(auditScript).toContain("public/assets/skier.glb");
    expect(auditScript).toContain("public/assets/alpine/");
    expect(auditScript).toContain("--require-pack");
    expect(toolsScript).toContain("Refusing to overwrite source");
    expect(pack.models.length).toBe(9);
  });
});
