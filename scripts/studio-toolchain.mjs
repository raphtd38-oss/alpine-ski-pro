#!/usr/bin/env node
/** Offline 3D tool registry and non-destructive GLB candidate validation.
 * No network requests, extra packages, shell interpolation or writes to assets.
 * PlayCanvas stays the only browser runtime. */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const catalog = JSON.parse(readFileSync(new URL('./studio-toolchain.json', import.meta.url), 'utf8'));
const flags = new Set(process.argv.slice(2).filter(arg => arg.startsWith('--')));
const action = process.argv[2] ?? 'list';
const asJSON = flags.has('--json');
if (new Set(catalog.tools.map(t => t.id)).size !== catalog.tools.length) throw Error('Duplicate 3D tool IDs');

function installed(check) {
  if (!check) return null;
  const result = spawnSync(check[0], check.slice(1), {
    encoding: 'utf8', timeout: 5000, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return !result.error && result.status === 0;
}

export function inspectGLB(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 28) throw Error('GLB file is too small');
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw Error('GLB magic mismatch');
  if (bytes.readUInt32LE(4) !== 2) throw Error('Expected GLB version 2');
  if (bytes.readUInt32LE(8) !== bytes.length) throw Error('GLB declared byte length mismatch');
  let offset = 12;
  let gltf = null;
  while (offset + 8 <= bytes.length) {
    const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    if (size % 4 || offset + size > bytes.length) throw Error('Invalid GLB chunk bounds');
    if (type === 0x4e4f534a) {
      if (gltf) throw Error('Duplicate GLB JSON chunk');
      try { gltf = JSON.parse(bytes.toString('utf8', offset, offset + size)); }
      catch { throw Error('Malformed GLB JSON'); }
    }
    offset += size;
  }
  if (offset !== bytes.length || !gltf) throw Error('No valid GLB JSON chunk');
  if (gltf.asset?.version !== '2.0') throw Error('Missing glTF 2.0 asset declaration');
  if (!Array.isArray(gltf.meshes) || !gltf.meshes.length) throw Error('No meshes in asset');
  const errors = [], warnings = [];
  let triangles = 0, primitives = 0, missingNormals = 0, missingUV = 0;
  for (const mesh of gltf.meshes) {
    if (!Array.isArray(mesh.primitives) || !mesh.primitives.length) errors.push('Empty mesh primitives');
    for (const primitive of mesh.primitives ?? []) {
      primitives++;
      const position = primitive.attributes?.POSITION;
      if (!Number.isInteger(position) || !gltf.accessors?.[position]) {
        errors.push('Primitive has no valid position accessor'); continue;
      }
      if (!Number.isInteger(primitive.attributes?.NORMAL)) missingNormals++;
      if (!Number.isInteger(primitive.attributes?.TEXCOORD_0)) missingUV++;
      const accessor = gltf.accessors[primitive.indices ?? position];
      if (!accessor || !Number.isFinite(accessor.count) || accessor.count < 0) {
        errors.push('Primitive has invalid index accessor'); continue;
      }
      if ((primitive.mode ?? 4) === 4) triangles += Math.floor(accessor.count / 3);
    }
  }
  if (missingNormals) warnings.push(String(missingNormals) + ' primitives without normals');
  if (missingUV) warnings.push(String(missingUV) + ' primitives without UV0');
  for (const ext of gltf.extensionsRequired ?? []) {
    if (['KHR_draco_mesh_compression', 'KHR_texture_basisu', 'EXT_meshopt_compression'].includes(ext))
      warnings.push('Verify PlayCanvas decoder for extension: ' + ext);
  }
  return {
    meshes: gltf.meshes.length, primitives, triangles,
    skins: gltf.skins?.length ?? 0,
    joints: (gltf.skins ?? []).reduce((n, skin) => n + (skin.joints?.length ?? 0), 0),
    animations: (gltf.animations ?? []).map(clip => clip.name ?? '(unnamed)'),
    materials: gltf.materials?.length ?? 0, images: gltf.images?.length ?? 0,
    extensionsRequired: gltf.extensionsRequired ?? [],
    errors, warnings
  };
}

export function validateCandidate(bytes, profile = 'generic') {
  if (!['generic', 'skier', 'scenery'].includes(profile)) throw Error('Unknown profile: ' + profile);
  const result = inspectGLB(bytes);
  if (profile === 'skier') {
    if (!result.skins) result.errors.push('Skier needs at least one skinned rig');
    if (result.joints < 12) result.errors.push('Skier needs at least 12 joints');
    if (!result.animations.length)
      result.warnings.push('No animation clips; verify PlayCanvas procedural animation and retargeting');
  }
  if (!result.materials) result.warnings.push('No materials: check PBR in PlayCanvas');
  if (profile === 'scenery' && result.triangles > 150000)
    result.warnings.push('High triangle count: evaluate LOD');
  return { profile, valid: result.errors.length === 0, ...result };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (action === 'list' || action === 'doctor') {
    const tools = catalog.tools.map(tool => ({
      ...tool, status: tool.id === 'playcanvas' ? 'in-project' :
      action === 'doctor' && tool.check ? (installed(tool.check) ? 'available' : 'not-detected') :
      tool.kind === 'chatgpt-connector' ? 'check-chatgpt-connection' : 'not-checked'
    }));
    if (asJSON) console.log(JSON.stringify({ tools, note: catalog.purpose }, null, 2));
    else {
      console.log('Alpine Ski Pro: ' + tools.length + ' 3D/design tools; PlayCanvas stays the engine.');
      for (const tool of tools)
        console.log('- ' + tool.name + ' [' + tool.status + ']: ' + tool.role + '\n  ' + tool.url);
    }
  } else if (action === 'validate') {
    const filename = process.argv[3];
    const profile = process.argv.find(s => s.startsWith('--profile='))?.split('=')[1] ?? 'generic';
    if (!filename || !filename.toLowerCase().endsWith('.glb') || !existsSync(filename)) {
      console.error('Usage: studio:validate -- <candidate.glb> [--profile=skier|scenery|generic] [--json]');
      process.exitCode = 2;
    } else {
      try {
        const result = validateCandidate(readFileSync(filename), profile);
        if (asJSON) console.log(JSON.stringify(result, null, 2));
        else console.log(JSON.stringify(result, null, 2));
        if (!result.valid) process.exitCode = 1;
      } catch (error) {
        if (asJSON) console.log(JSON.stringify({ valid: false, error: String(error.message) }));
        else console.error(String(error.message));
        process.exitCode = 1;
      }
    }
  } else {
    console.error('Commands: list | doctor | validate <candidate.glb> [--profile=skier|scenery|generic] [--json]');
    process.exitCode = 2;
  }
}
