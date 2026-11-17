# Studio 3D et outils de conception — Alpine Ski Pro (17 novembre 2026)

**Le jeu reste sous PlayCanvas 2.24.1, TypeScript et Vite.** Unreal, Unity et Godot sont des moteurs autonomes, pas des plugins de PlayCanvas. Le catalogue permet de les utiliser pour des prototypes ou des références hors ligne, sans changer le moteur de la version jouable.

## Outils répertoriés

Le registre `scripts/studio-toolchain.json` décrit 21 outils : Blender, PlayCanvas, glTF Transform, Khronos KTX-Software, Khronos glTF Validator, uv/Blender MCP, Godot, Unreal Engine, Unity, Houdini, Gaea, Adobe Substance 3D, Material Maker, Krita, Cascadeur, Adobe Mixamo, Poly Haven, ambientCG, Figma, Adobe Creative Cloud et fal. Le registre décrit les usages, sources et conditions de licence. Un outil répertorié n'est pas installé automatiquement.

## Commandes opérationnelles

- `npm run studio:list` — affiche les 21 outils et leurs liens.
- `npm run studio:doctor` — vérifie seulement les exécutables CLI reconnus; n'ouvre pas les éditeurs graphiques.
- `npm run studio:validate -- artwork/skier-candidate.glb --profile=skier` — vérifie la structure d'un GLB et le rig de base; sans écraser le modèle original.
- `npm run studio:validate -- artwork/chalet-candidate.glb --profile=scenery --json` — vérifie un décor et produit un rapport JSON.
- `npm run assets:doctor`, `npm run assets:audit` et `npm run assets:search -- snow --type texture` restent disponibles.

Le nouveau validateur analyse la structure GLB 2.0, les primitives, UV/normales, les articulations, les animations déclarées et les extensions requérant des décodeurs. **Ce n'est pas un validateur officiel glTF** : vérifier également la conformité Khronos, les UV, les poids des os et le chargement PlayCanvas sur WebGL2/iPhone/WebGPU. Aucun outil cloud ne garantit à lui seul des modèles réalistes ou des performances.

## Pipeline de production conseillé

1. **Concept et interface** : Adobe et Figma dans ChatGPT si connectés; produire des concepts et UI, pas de fausse géométrie 3D.
2. **Modèle 3D original** : Blender; pour les terrains, Houdini ou Gaea en amont. Un asset IA de fal nécessite nettoyage, licence vérifiée et retopologie.
3. **Skieur de compétition** : modéliser skis de Super-G, casque et fixations; rig anatomique continu (hanches, genoux, chevilles, épine, épaules, coudes). Animations sur les carres très basses, absorption et main basse à l'arrivée. Ne pas remplacer le GLB sans retargeting correct de `src/render/athlete.ts`.
4. **Textures** : Blender/Material Maker ou Substance 3D sous licence appropriée; PBR albedo, normales OpenGL, roughness, AO. Vérifier source et droits.
5. **Export** : conserver le `.blend` original, produire un nouveau `.glb` candidat avec `scripts/blender/export_glb.py`; exécuter `studio:validate`, puis Khronos Validator; glTF Transform/texture compression uniquement sur copies.
6. **Jeu** : mettre à jour `docs/ASSETS.md` et son audit, importer dans PlayCanvas, tester cinématique et performances sur de vrais GPU et smartphones. Conserver les fichiers d'origine et le fallback textures.

## Statut réel et limites

Le catalogue, les commandes locales, les tests et la documentation sont livrés comme **outils de développement**, pas comme changement graphique instantané. Aucun des logiciels externes n'est installé sur ton PC par ce dépôt. Les services IA et logiciels commerciaux peuvent être payants. Pour Blender MCP, configurer un serveur local avec Blender + uv sur un ordinateur compatible; ChatGPT Web/iPhone ne lance pas ce serveur local automatiquement.

Voir également `docs/RESOURCE_CATALOG.md`, `docs/ASSET_WORKFLOW.md`, `docs/STUDIO_KIT_2026.md` et `AGENTS.md`.
