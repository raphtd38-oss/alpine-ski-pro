#!/usr/bin/env node
/**
 * Alpine Ski Pro Studio 3D — optional local tooling, Node built-ins only.
 * Does not download programs or modify production assets automatically.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const usage = [
  'Alpine Ski Pro Studio 3D',
  '  node scripts/studio.mjs doctor',
  '  node scripts/studio.mjs inspect model.glb [--json]',
  '  node scripts/studio.mjs verify model.glb [--rig] [--animations] [--json]',
  '  node scripts/studio.mjs optimize static-model.glb candidate.glb',
  'Optimization needs gltf-transform installed locally, and never overwrites the original.'
].join('\n');
function fail(message) { console.error('Studio 3D: ' + message); process.exitCode = 1; }
function attempt(command, args = ['--version']) {
  const p = spawnSync(command, args, { encoding: 'utf8', timeout: 4000, shell: false, windowsHide: true });
  if (p.error || p.status !== 0) return null;
  return (p.stdout || p.stderr || '').trim().split(/\r?\n/)[0].slice(0, 140);
}
function doctor() {
  const apps = [
    ['Node.js', 'node', ['--version']], ['Blender', 'blender', ['--version']],
    ['Blender MCP (uvx)', 'uvx', ['--version']], ['glTF Transform', 'gltf-transform', ['--version']],
    ['KTX-Software', 'toktx', ['--version']], ['Godot', 'godot', ['--version']],
    ['FFmpeg', 'ffmpeg', ['-version']], ['Python', 'python', ['--version']],
    ['ImageMagick', 'magick', ['-version']], ['OpenUSD', 'usdcat', ['--help']]
  ];
  let installed = 0;
  for (const [label, command, args] of apps) {
    const version = attempt(command, args);
    if (version) installed += 1;
    console.log((version ? '[OK]  ' : '[--]  ') + label + (version ? ': ' + version : ': non détecté (facultatif)'));
  }
  console.log('Outils détectés : ' + installed + '/' + apps.length + '. Rien n’a été installé.');
}
function readGLB(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw Error('en-tête GLB absent');
  if (buffer.readUInt32LE(4) !== 2) throw Error('version GLB != 2');
  if (buffer.readUInt32LE(8) !== buffer.length) throw Error('taille GLB incorrecte');
  const jsonSize = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4E4F534A || jsonSize <= 0 || jsonSize + 20 > buffer.length) throw Error('chunk JSON invalide');
  const data = JSON.parse(buffer.toString('utf8', 20, 20 + jsonSize).replace(/\u0000+$/g, ''));
  if (data.asset?.version !== '2.0') throw Error('asset glTF != 2.0');
  return { data, bytes: buffer.length };
}
function report(model) {
  const gltf = model.data;
  const meshes = gltf.meshes || [];
  const primitives = meshes.flatMap(m => m.primitives || []);
  const skins = gltf.skins || [];
  const animations = gltf.animations || [];
  const nodes = gltf.nodes || [];
  const jointRefs = skins.flatMap(s => s.joints || []);
  const skinPrimitives = primitives.filter(p => p.attributes?.JOINTS_0 !== undefined && p.attributes?.WEIGHTS_0 !== undefined);
  const issues = [];
  for (const joint of jointRefs) if (!Number.isInteger(joint) || joint < 0 || joint >= nodes.length) issues.push('Référence joint invalide: ' + joint);
  if (skins.length && !skinPrimitives.length) issues.push('Skin présent, mais aucune primitive avec JOINTS_0 et WEIGHTS_0');
  for (const [i, animation] of animations.entries()) {
    for (const channel of animation.channels || []) {
      if (channel.target?.node !== undefined && (channel.target.node < 0 || channel.target.node >= nodes.length)) {
        issues.push('Canal animation ' + i + ' référence un node inexistant');
      }
    }
  }
  return {
    fileSizeMiB: +(model.bytes / 1048576).toFixed(2),
    meshes: meshes.length, primitives: primitives.length, nodes: nodes.length,
    materials: (gltf.materials || []).length, textures: (gltf.textures || []).length,
    skins: skins.length, jointsReferenced: new Set(jointRefs).size,
    skinnedPrimitives: skinPrimitives.length,
    morphTargets: primitives.reduce((n,p) => n + (p.targets || []).length,0),
    animations: animations.map((a,i)=>({name:a.name || 'animation-' + i,channels:(a.channels||[]).length})),
    extensionsRequired: gltf.extensionsRequired || [],
    issues
  };
}
function inspect(path, { json = false, requireRig = false, requireAnimations = false } = {}) {
  if (!path || !existsSync(path)) throw Error('GLB absent : ' + (path || '(chemin manquant)'));
  if (!path.toLowerCase().endsWith('.glb')) throw Error('fichier .glb requis');
  const summary = report(readGLB(resolve(path)));
  if (requireRig && (!summary.skins || !summary.skinnedPrimitives)) summary.issues.push('Rig/weights requis mais absents');
  if (requireAnimations && summary.animations.length === 0) summary.issues.push('Animations requises mais absentes');
  if (json) console.log(JSON.stringify({path, ...summary}, null, 2));
  else {
    console.log('GLB : ' + path + ' (' + summary.fileSizeMiB + ' Mio)');
    console.log('Meshes: ' + summary.meshes + ', primitives: ' + summary.primitives + ', materials: ' + summary.materials);
    console.log('Skins: ' + summary.skins + ', joints: ' + summary.jointsReferenced + ', animations: ' + summary.animations.length);
    console.log('Morph targets: ' + summary.morphTargets + ', extensions requises: ' + summary.extensionsRequired.join(', '));
    console.log(summary.issues.length ? 'PROBLÈMES : ' + summary.issues.join('; ') : 'Structure de base correcte (pas une validation glTF complète).');
  }
  if (summary.issues.length) process.exitCode = 1;
  return summary;
}
function optimize(src, dest) {
  if (!src || !dest) throw Error('Entrée et sortie requises');
  if (resolve(src) === resolve(dest)) throw Error('On ne peut pas écraser la source');
  if (existsSync(dest)) throw Error('La sortie existe déjà : ' + dest);
  const before = inspect(src);
  if (before.skins || before.animations.length) throw Error('Asset animé/riggé : optimisation automatique interdite, passer par Blender et un QA dédié');
  const executable = attempt('gltf-transform');
  if (!executable) throw Error('Installer @gltf-transform/cli localement, puis relancer');
  const p = spawnSync('gltf-transform', ['optimize', resolve(src), resolve(dest), '--texture-compress', 'webp'], {stdio:'inherit', timeout:180000, shell:false, windowsHide:true});
  if (p.error || p.status !== 0 || !existsSync(dest) || statSync(dest).size < 20) throw Error('Optimisation échouée');
  const after = inspect(dest);
  if (before.meshes > 0 && after.meshes === 0) throw Error('Sortie sans mesh ! Ne pas l’intégrer');
  console.log('Candidat créé. Tester le rendu, la licence et le chargement PlayCanvas avant publication.');
}
try {
  const [task, first, second, ...options] = process.argv.slice(2);
  if (task === 'doctor') doctor();
  else if (task === 'inspect' || task === 'verify') inspect(first, {json:[second,...options].includes('--json'), requireRig:[second,...options].includes('--rig'), requireAnimations:[second,...options].includes('--animations')});
  else if (task === 'optimize') optimize(first, second);
  else { console.log(usage); if (task && !['help','--help'].includes(task)) process.exitCode = 1; }
} catch (error) { fail(error.message); }
