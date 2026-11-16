# Pipeline d'import 3D / textures PBR / animations dans Alpine Ski Pro

Destiné à un développeur ou agent IA qui reprend le dépôt. Voir docs/RESOURCE_CATALOG.md pour toutes les sources vérifiées et docs/ASSETS.md pour les droits des fichiers livrés.

## 1. Rechercher, sélectionner, consigner la licence

1. Rechercher via npm run assets:search -- "snow" --type texture ou directement dans Poly Haven / ambientCG.
2. Vérifier la page précise de l'asset, sa licence et l'autorisation de redistribution de fichiers intégrés à un jeu. Faire une distinction entre CC0 et une licence autorisant seulement l'utilisation à l'intérieur d'un produit.
3. Mesurer le poids et la complexité. Choisir prioritairement GLB et textures PBR 1K/2K adaptées au Web.
4. Conserver auteur, URL, licence, date de vérification, fichiers et destinations dans docs/ASSETS.md et dans un manifeste contrôlé.
5. L'audit des ressources refuse les nouveaux binaires dont la provenance est absente ; adapter scripts/asset_audit.mjs après vérification individuelle.

## 2. Artiste et skieur : Blender → GLB

- Préparer un modèle original (combinaison, dossard, casque, chaussures, protections, skis, bâtons).
- Appliquer une bonne topologie au niveau des articulations, UV unwrap puis bake albedo, metallic, roughness et normals OpenGL.
- Garder les noms des articulations manipulées par src/render/athlete.ts ou coder un retarget explicite ; ne jamais se contenter d'importer une animation générique qui briserait les poses d'appuis.
- Créer plusieurs clips utilisables : race_start, carve_left, carve_right, tuck, pole_contact, jump, land, finish. Les clips génériques de marche ne sont pas des animations professionnelles de ski.
- Exporter avec Blender localement : blender --background --python scripts/blender/export_glb.py -- --input artwork/skier.blend --output artwork/skier-candidate.glb
- Vérifier le GLB : node scripts/asset_tools.mjs inspect artwork/skier-candidate.glb (glTF Transform requis) et https://github.khronos.org/glTF-Validator/
- Test indispensable : vérifier les joints/animations, l'échelle 1 unité = 1 m, la caméra, les replays, les collisions, la version WebGL2 et la version WebGPU.

## 3. Optimiser les modèles sans écraser les originaux

Installer la CLI optionnelle : npm install --global @gltf-transform/cli

- Diagnostic local : npm run assets:doctor
- Inspecter : node scripts/asset_tools.mjs inspect artwork/rocher.glb
- Optimiser en WebP : node scripts/asset_tools.mjs webp artwork/rocher.glb artwork/rocher-optimise.glb
- Revalider l'asset optimisé avec le validateur glTF et des tests de chargement PlayCanvas.

Les conversions de formats et les simplifications de mesh peuvent modifier des matériaux, le skinning, les animations ou des extensions : toujours tester. Ne jamais remplacer le GLB de l'athlète sans une version compatible des tests scripts/check_skier.mjs et src/render/athlete.ts.

## 4. Couleurs, maps PBR et compression

- Albedo / baseColor : sRGB, couleurs crédibles et micro-variations adaptées à la piste.
- Normal OpenGL : axes corrects (+Y), import linéaire, ne pas inverser arbitrairement la composante verte.
- Roughness : canal linéaire, inverse du gloss PlayCanvas. Eviter la brillance plastique excessive sur la neige.
- AO, metallic et height : les appliquer selon les matériaux et les possibilités de rendu, ne pas surmultiplier les textures.
- KTX2 : glTF Transform (commandes ETC1S pour couleurs, UASTC pour normales), Khronos KTX-Software pour validation. Ne pas renommer un fichier JPG en KTX2. Le transcodeur/chargement Basis doit être configuré et vérifié sur WebGL2, Safari iOS, WebGPU et machines modestes avant de remplacer les JPG actuels.
- Les cartes Snow 02 JPG 1K restent le repli stable. Conserver le droit de revenir au précédent shader si la qualité régressait.

## 5. LOD et budgets visuels

- Proche : modèles GLB avec textures PBR, peu d'instances et des silhouettes soignées.
- Intermédiaire : niveaux de détail simplifiés, textures de plus faible résolution, ombres réduites.
- Lointain : arbres par maillages regroupés, montagnes à faible coût, culling ; éviter le chargement infini.
- Les éléments de décor doivent rester hors de la trajectoire de compétition, et le LOD ne doit pas modifier les règles physiques.
- Les performances PC/iPhone doivent être mesurées par GPU réel (FPS, temps CPU/GPU, mémoire et draw calls). Le nombre de modèles seul ne démontre pas un gain FPS.

## 6. Contrôles et livraison

Sur un poste avec Node :

1. npm ci
2. npm run assets:alpine (télécharge la sélection approuvée)
3. npm run assets:audit
4. npm test
5. npm run build
6. npm run test:e2e

La CI prépare et publie les binaires approuvés avec leur manifeste ; les scripts d'art (Blender, KTX-Software, Mixamo) ne sont pas nécessaires aux visiteurs pour jouer. Les recherches API sont faites uniquement à la demande du développeur, pas par le moteur PlayCanvas pendant une course.

**Confidentialité :** ne jamais enregistrer de clés ou mots de passe dans le dépôt. Les comptes qui demandent une identité, un mail, une validation d'âge, un paiement ou une vérification humaine doivent être ouverts par leur propriétaire, pas automatiquement par un agent.