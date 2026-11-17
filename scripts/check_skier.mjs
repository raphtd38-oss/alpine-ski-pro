/**
 * Validate the committed original pro-skier GLB in Node (no Blender required).
 * The continuous skin has genuine multi-bone weights and the exact joints
 * already driven by src/render/athlete.ts.
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const bytes = readFileSync("public/assets/skier.glb");
const head = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
assert.equal(head.getUint32(0, true), 0x46546c67, "Expected glTF binary header");
assert.equal(head.getUint32(4, true), 2, "Expected glTF 2.0");
assert.equal(head.getUint32(8, true), bytes.length, "Invalid binary length");
const jsonLength = head.getUint32(12, true);
assert.equal(head.getUint32(16, true), 0x4e4f534a);
const doc = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const binStart = 20 + jsonLength;
assert.equal(head.getUint32(binStart + 4, true), 0x004e4942);
const binLength = head.getUint32(binStart, true);
assert.equal(doc.buffers[0].byteLength, binLength);
assert.equal(binStart + 8 + binLength, bytes.length);
assert.ok(doc.materials.length >= 12);
assert.ok(doc.images?.length >= 12, "Studio Kit race suit needs color, normal and ORM maps");
assert.ok(doc.textures?.length >= 4, "Race materials must be UV textured");
for (const image of doc.images) {
  assert.equal(image.mimeType, "image/png");
  const view = doc.bufferViews[image.bufferView];
  assert.ok(view.byteLength > 256 && view.byteLength < 200_000);
  assert.equal(head.getUint32(binStart + 8 + view.byteOffset, false),
    0x89504e47, "Texture must be an embedded PNG");
}
for (const index of [0, 1, 2, 3, 4, 5]) {
  const m = doc.materials[index];
  assert.ok(m.pbrMetallicRoughness.baseColorTexture,
    "Suit, bib, helmet, boots and visor require genuine albedo maps");
  assert.ok(m.normalTexture && m.normalTexture.index >= 4,
    "Skier suit needs a true OpenGL tangent-space normal map");
  assert.ok(m.pbrMetallicRoughness.metallicRoughnessTexture &&
    m.pbrMetallicRoughness.metallicRoughnessTexture.index >= 5,
    "Skier suit needs packed metallic/roughness maps");
  assert.ok(m.occlusionTexture && m.occlusionTexture.index >= 5,
    "Skier suit needs ambient occlusion");
}
assert.ok(doc.meshes[0].primitives.length >= 40, "Need substantial body and equipment geometry");
const skinnedJointNames = [
  "Pelvis", "Spine", "Chest", "Neck", "Head",
  ...["L", "R"].flatMap((s) => [
    s + "Hip", s + "Knee", s + "Ankle",
    s + "Shoulder", s + "Elbow", s + "Wrist",
  ]),
];
for (const n of skinnedJointNames)
  assert.ok(doc.nodes.some((j) => j.name === n), "Missing animation joint " + n);
assert.equal(doc.skins[0].joints.length, 18);
const skin = doc.skins[0].joints;
let total = 0, blended = 0;
function accessorView(i) {
  const a = doc.accessors[i], bv = doc.bufferViews[a.bufferView];
  return { a, offset: binStart + 8 + bv.byteOffset + (a.byteOffset ?? 0) };
}
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
for (const primitive of doc.meshes[0].primitives) {
  const { a: pos } = accessorView(primitive.attributes.POSITION);
  const { a: jointAcc, offset: jointsOffset } = accessorView(primitive.attributes.JOINTS_0);
  const { a: weightAcc, offset: weightsOffset } = accessorView(primitive.attributes.WEIGHTS_0);
  const { a: indexAcc, offset: indexOffset } = accessorView(primitive.indices);
  assert.equal(pos.count, jointAcc.count);
  const { a: tex, offset: texOffset } = accessorView(primitive.attributes.TEXCOORD_0);
  assert.equal(tex.count, pos.count);
  assert.equal(tex.componentType, 5126);
  for (let i = 0; i < tex.count; i++) {
    const u = view.getFloat32(texOffset + i * 8, true);
    const v = view.getFloat32(texOffset + i * 8 + 4, true);
    assert.ok(Number.isFinite(u) && u >= 0 && u <= 1.001);
    assert.ok(Number.isFinite(v) && v >= 0 && v <= 1.001);
  }
  assert.equal(pos.count, weightAcc.count);
  assert.equal(jointAcc.componentType, 5123);
  assert.equal(weightAcc.componentType, 5126);
  assert.equal(indexAcc.componentType, 5125);
  for (let i = 0; i < pos.count; i++) {
    let weightSum = 0, present = 0;
    for (let c = 0; c < 4; c++) {
      const jointIndex = view.getUint16(jointsOffset + i * 8 + c * 2, true);
      const weight = view.getFloat32(weightsOffset + i * 16 + c * 4, true);
      assert.ok(Number.isFinite(weight) && weight >= 0 && weight <= 1.001);
      assert.ok(jointIndex >= 0 && jointIndex < skin.length);
      if (weight > 0.01) present++;
      weightSum += weight;
    }
    assert.ok(Math.abs(weightSum - 1) < 0.0001, "Skin weights must sum to one");
    if (present >= 2) blended++;
    total++;
  }
  for (let i = 0; i < indexAcc.count; i++)
    assert.ok(view.getUint32(indexOffset + i * 4, true) < pos.count);
}
assert.ok(total >= 6500, "New racer must have real anatomical detail");
assert.ok(blended > 250, "Must use joint blending instead of all rigid single-bone surfaces");
assert.ok(total < 14000, "Browser polygon budget must remain manageable");
console.log("Valid professional ski athlete:", {
  bytes: bytes.length, joints: skin.length, materials: doc.materials.length,
  surfaces: doc.meshes[0].primitives.length, vertices: total,
  multiWeightVertices: blended,
});
