# Studio Kit 2026 — bilan d'intégration V1.10

Archive utilisateur examinée le 17 novembre 2026 : `Alpine_Ski_Pro_Studio_Kit_2026(1).zip`.

- SHA-256 archive : `23cd9eb0fcad462ce73a026da7876308e07b5a0ec8f6b8e0c8947a8210b4b587`
- 96 entrées : 11 GLB d'objets/terrains, 7 jeux × 6 cartes PBR PNG (512 px), scripts de création Python/Node/Blender, exemples PlayCanvas, guides, modèles et rapports.
- Contrôle de provenance : l'archive déclare que les matériaux/GLB sont des créations originales du projet ; les scripts n'importent ni assets d'autres jeux, ni compte payant, ni clé API. La publication de ces fichiers est autorisée par le propriétaire qui a transmis le kit, mais **leur qualité n'est pas photoréaliste**.

## Composants réellement adoptés dans le jeu

1. **LOD des modèles CC0 déjà présents** : adaptation de `03_PLAYCANVAS_EXAMPLES/lod-controller.ts` et du budget `04_TEMPLATES/BUDGETS_PERFORMANCE.json` dans `src/render/scenery-lod.ts` et `src/render/alpine-assets.ts`. Distances selon qualité, hysteresis de 12 m, cadence ~0,22 s, sans modification de la course 120 Hz. Les montagnes et forêts procédurales groupées restent présentes au loin.
2. **Matériaux PBR de l'athlète** : principes de `02_SCRIPTS/python/generate_pbr.py`, matériau `race_fabric`. `scripts/racer-textures.mjs` génère de nouvelles normales OpenGL et textures ORM à côté des quatre albédo préexistants. Tous sont embarqués dans le même GLB d'athlète 18 articulations. Pas besoin d'installer Python, Blender ou les 42 images dans le navigateur.
3. **Dynamique de poudreuse** : adaptation des conseils de compétition du guide `01_GUIDES/06_RACE_DESIGN.md` : la réception crée un panache distinct des gerbes de carving ; intensité testable depuis `src/game/snow.ts`, rendu par les particules déjà groupées à 30 Hz de `src/render/effects.ts`.

## Éléments conservés pour évaluation ultérieure, pas copiés dans la production

- 11 GLB : ces prototypes sont géométriques et ne remplacent pas actuellement les 9 GLB CC0 Alpine Snow Village déjà branchés, ni le GLB du skieur animé. `terrain_lod0..2.glb` ne partagent pas la fonction physique de la piste et ne doivent pas être utilisés comme terrain skiable.
- `snow_groomed` : le jeu dispose de Snow 02 photo-PBR de Poly Haven, de meilleure qualité photographique ; éviter une régression visuelle.
- Les fichiers PBR `chalet_wood`, `granite_alpine`, `slate_ridge`, `ice_compacted` et `snow_powder` restent des références originales pour les prochains décors PBR.
- Les scripts Blender et les outils d'inspection GLB du kit sont documentés et peuvent être utilisés hors runtime ; aucune application desktop n'est automatiquement installée sur le PC du joueur.

## Empreintes de contrôle (échantillon)

- `05_ASSETS/PBR/race_fabric/race_fabric_normal.png` : SHA-256 `43e45baa61df39b2a6294ed959e18b8166ca17b637d4ddffd87e680a356c4d0c`
- `05_ASSETS/PBR/granite_alpine/granite_alpine_normal.png` : SHA-256 `d1cd8923adbce29385fe36c295f5a892ff738839788af555062c809dc40cf4e4`
- `05_ASSETS/GLB/alpine_chalet.glb` : SHA-256 `ab7a27b4e72d0ad80759b3ee2aa9f3e325624439ac1acab79eb7813ae3df8f15`

## Contrôles attendus

`npm ci`, `npm test` (inclut la génération GLB), `npm run build` (TypeScript strict, Vite et pack), `npm run test:e2e` (Playwright) et audit des assets CI. Conserver les licences et mesurer les FPS **sur vrai matériel**, et non sur SwiftShader. Ne pas annoncer photoréalisme AAA, simulation FIS homologuée ou retour de GPU non mesuré.
