# Studio 3D — Alpine Ski Pro

## Architecture
Le jeu publié reste en **PlayCanvas 2.24.1 + TypeScript + Vite**. Les autres moteurs et logiciels sont un **atelier de production externe** : on ne lance pas Unity, Unreal ou Godot dans la page web. Le format d'échange recommandé est **glTF 2.0 / GLB** et les maps PBR.

**Réalité de l'intégration :** ce kit ajoute un registre exploitable, un outil de diagnostic et un inspecteur GLB autonome, plus une configuration Blender MCP à activer sur le poste. Il n'installe pas les logiciels, ne télécharge pas d'assets premium et ne prétend pas les rendre disponibles depuis l'iPhone.

## Commandes utilisables immédiatement

```bash
npm run studio:doctor
npm run studio:inspect -- public/assets/skier.glb --json
npm run studio:verify -- public/assets/skier.glb --rig
```

`studio:verify` effectue une vérification structurelle de base, **pas** une conformité exhaustive. Pour l'officialiser, exécuter aussi le **Khronos glTF Validator**.

## Optimisation optionnelle (ne jamais écraser la source)

Installer séparément `npm install --global @gltf-transform/cli` sur le poste de développement, puis :

```bash
npm run studio:optimize -- artwork/chalet.glb artwork/chalet-webp-candidate.glb
```

Cette opération refuse volontairement d'optimiser automatiquement un modèle riggé ou animé : le skieur est critique pour la simulation. Tester ensuite la géométrie, les matériaux, le chargement PlayCanvas et les animations sur PC + iPhone. WebP n'est pas KTX2 ; la compression Meshopt/Draco/KTX2 n'est pas activée automatiquement tant que les décodeurs navigateur ne sont pas testés.

## Intégration des meilleurs outils

Le registre machine-readable `tools/studio/catalog.json` fournit les logiciels, leurs rôles, leurs sites officiels, leurs familles de licences à **revérifier** et leur mode d'utilisation.

- **Sculpt / base du personnage :** Blender, Maya, ZBrush, Character Creator.
- **Rig, musculature et animation :** Blender, Cascadeur, Rokoko, iClone ; évitez d'utiliser des animations génériques pour le Super-G sans retargeting.
- **Tissus et ski pro :** Marvelous Designer pour la combinaison ; Blender pour les chaussures, skis, fixations, piquets et articulation.
- **Textures et neige :** Substance 3D Painter/Designer, Mari, Material Maker, ArmorPaint, Krita ; importer PBR GLB/PNG/JPG/KTK2 vérifiés.
- **Montagne et détails :** Houdini, Gaea, World Machine, MeshLab, terrains de référence Unreal ; ne jamais modifier la topologie physique de la piste sans tests.
- **Optimisation Web :** glTF Transform, glTF Validator, meshoptimizer, KTX-Software/Basis Universal, avec contrôles de décodeurs.
- **Alternatives techniques :** Unity/Godot/Babylon.js/Three.js pour tester des scènes ou techniques, **pas comme plusieurs moteurs simultanés en runtime**.

## Pipeline de validation (Super-G)

1. Produire en `.blend` / FBX / USD selon outil, conserver la source autorisée.
2. Contrôler l'échelle en mètres, articulation 18+ os (sans prétendre qu'un minimum crée un modèle réaliste), weight painting, contact skis/chaussures, caméra carving, uv, normal map OpenGL, PBR.
3. Exporter en GLB via `scripts/blender/export_glb.py`, puis `studio:inspect`, Khronos Validator et `scripts/check_skier.mjs`.
4. Ajouter auteur, licence et URL exactes à `docs/ASSETS.md`. **Ne pas utiliser d'assets propriétaires de jeux concurrents.**
5. Charger dans PlayCanvas, tester sur PC, iPhone, WebGL2/WebGPU quand disponibles, puis `npm test && npm run build && npm run test:e2e`.
6. Évaluer la qualité *visuellement* et les performances *sur GPU réel*. Aucune promesse de photoréalisme ou FPS non mesuré.

## ChatGPT et Blender MCP

`tools/studio/blender-mcp.json` indique un serveur **local** `uvx mcp-for-blender`. Cela exige sur le PC Blender, uv, l'addon Blender MCP et un client supportant les serveurs stdio locaux. Ce fichier seul ne rend pas Blender accessible dans ChatGPT web/iPhone. Un dossier ChatGPT privé nommé *Blender MCP – Alpine Ski Pro* contient déjà les instructions et doit rester cohérent avec ce kit.

## Sources de référence

- [PlayCanvas GLB](https://developer.playcanvas.com/user-manual/assets/models/building/)
- [PlayCanvas engine](https://playcanvas.com/products/engine)
- [Blender MCP communautaire](https://github.com/ahujasid/mcp-for-blender)
- [glTF Transform CLI](https://gltf-transform.dev/cli)
- [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/)
- [Ressources existantes du dépôt](RESOURCE_CATALOG.md)

## Limites

Les logiciels payants ne sont ni téléchargés, ni redistribués dans GitHub. Aucun compte n'est créé. Un logiciel référencé dans le catalogue n'est pas nécessairement installé. Le skieur de production est inchangé dans cette intégration.
