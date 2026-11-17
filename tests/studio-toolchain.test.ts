import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function glb(skinned = false) {
  const json = {
    asset: { version: '2.0' },
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3 }] }],
    accessors: [{ count: 3 }, { count: 3 }, { count: 3 }, { count: 3 }],
    materials: [{}],
    ...(skinned ? { skins: [{ joints: Array.from({ length: 18 }, (_, i) => i) }] } : {})
  };
  const data = Buffer.from(JSON.stringify(json));
  const padded = Buffer.concat([data, Buffer.alloc((4 - data.length % 4) % 4, 0x20)]);
  const buffer = Buffer.alloc(20 + padded.length);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(padded.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(buffer, 20);
  return buffer;
}
describe('studio toolchain, offline', () => {
  const cli = 'scripts/studio-toolchain.mjs';
  it('provides Blender and the existing PlayCanvas engine', () => {
    const data = JSON.parse(execFileSync(process.execPath, [cli, 'list', '--json'], { encoding: 'utf8' }));
    expect(data.tools.length).toBe(21);
    expect(data.tools.some((t: { id: string }) => t.id === 'blender')).toBe(true);
    expect(data.tools.some((t: { id: string }) => t.id === 'playcanvas')).toBe(true);
  });
  it('rejects an unrigged skier, accepts a skinned candidate and preserves source', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skier-toolchain-'));
    const name = join(dir, 'candidate.glb');
    try {
      writeFileSync(name, glb());
      const generic = JSON.parse(execFileSync(process.execPath, [cli, 'validate', name, '--json'], { encoding: 'utf8' }));
      expect(generic.valid).toBe(true);
      expect(generic.triangles).toBe(1);
      const failed = spawnSync(process.execPath, [cli, 'validate', name, '--profile=skier', '--json'], { encoding: 'utf8' });
      expect(failed.status).toBe(1);
      expect(JSON.parse(failed.stdout).errors).toContain('Skier needs at least one skinned rig');
      writeFileSync(name, glb(true));
      const valid = JSON.parse(execFileSync(process.execPath, [cli, 'validate', name, '--profile=skier', '--json'], { encoding: 'utf8' }));
      expect(valid.valid).toBe(true);
      expect(valid.joints).toBe(18);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('rejects a malformed GLB', () => {
    const dir = mkdtempSync(join(tmpdir(), 'invalid-toolchain-'));
    try {
      const file = join(dir, 'bad.glb');
      writeFileSync(file, Buffer.alloc(36));
      const run = spawnSync(process.execPath, [cli, 'validate', file, '--json'], { encoding: 'utf8' });
      expect(run.status).toBe(1);
      expect(JSON.parse(run.stdout).valid).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
