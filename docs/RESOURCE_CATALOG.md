# Alpine Ski Pro — catalogue de ressources pour les agents de développement

Date de vérification : 16 novembre 2026. Référence durable et actionnable, à compléter avec docs/ASSETS.md et docs/ASSET_WORKFLOW.md. La présence d'un lien n'implique ni installation ni compte créé.

## Ressources déjà intégrées au jeu

- Alpine Snow Village (https://3dassets.dev/packs/alpine-snow-village) : neuf GLB de sapins, rochers, chalets et panneaux téléchargés à la construction ; licences CC0 documentées dans docs/ASSETS.md.
- Snow 02 de Poly Haven (https://polyhaven.com/a/snow_02), par Rob Tuytel : trois textures photo-PBR 1K (diffuse, normale OpenGL et roughness), avec fallback original.
- Coureur original riggé généré par scripts/build_skier_pro.mjs, 18 os et animation semi-procédurale / IK.

## Catalogues de modèles, matériaux et animations

| Source | Usage | Licence et conditions | Accès |
|---|---|---|---|
| [Poly Haven](https://polyhaven.com) / [API officielle](https://polyhaven.com/our-api) | textures photo-PBR, HDRI, modèles roche/neige/bois | [CC0](https://polyhaven.com/license). API en direct : attribution « Poly Haven » et User-Agent spécifique obligatoire. | gratuit sans compte ni clé |
| [ambientCG](https://ambientcg.com) / [API v3](https://docs.ambientcg.com/api/v3/assets/) | neige, glace, roches, bois et matériaux PBR | [CC0](https://docs.ambientcg.com/license/), sources téléchargeables ; choisir les cartes nécessaires | gratuit sans compte pour les contenus publics |
| [Kenney](https://kenney.nl/assets) / [FAQ licence](https://kenney.nl/support) | UI, props 3D, signalétique, packs de forêt stylisée | packs d'assets [CC0](https://kenney.nl/support). Certains outils et bundles globaux sont payants. | packs individuels gratuits |
| [Quaternius Universal Animation Library](https://quaternius.itch.io/universal-animation-library) | 120+ actions humanoïdes, locomotion, chutes, mouvement des bras, retargeting | la **page de ce pack** affiche CC0 ; cependant [la licence générale QAL](https://quaternius.com/license.html) publiée le 28/08/2026 interdit la redistribution d'assets nus. Vérifier la licence au téléchargement et éviter un réhébergement automatique. Pas de vrai mocap de slalom garanti. | Standard gratuit via itch.io |
| [Adobe Mixamo](https://www.mixamo.com) / [FAQ Adobe](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | rig automatique d'humanoïdes, mouvements de base | Adobe permet usage dans un jeu commercial mais **pas CC0** ; ne pas revendre une collection d'animations distinctes. Ne fournit pas automatiquement le carving compétition. | Adobe ID requis, gratuit sans Creative Cloud |

## Logiciels de production

| Outil | Ce qu'il apporte au jeu | Statut |
|---|---|---|
| [Blender](https://www.blender.org/download/) | modélisation, sculpture, UV, rigging, weight paint, keyframes, mocap retargeting, bake et export GLB | logiciel libre ; exportateur prêt dans scripts/blender/export_glb.py |
| [Material Maker](https://www.materialmaker.org/) | graphes de matériaux PBR bois, neige et roche, normales, roughness, masques | logiciel libre |
| [Krita](https://krita.org/) | habillage de combinaison, dossard et logos originaux, albedo et masques | logiciel libre |
| [GIMP](https://www.gimp.org/) | nettoyage photo, masques, retouches de textures | logiciel libre |
| [glTF Transform](https://gltf-transform.dev/cli) | inspection, optimisation GLB, WebP, Basis/KTX2 | CLI MIT ; installation optionnelle par npm |
| [Khronos glTF Validator](https://github.khronos.org/glTF-Validator/) | conformité glTF 2.0 des fichiers, poids et références | outil officiel gratuit |
| [Khronos KTX-Software](https://github.com/KhronosGroup/KTX-Software) | format KTX2, encodage ETC1S/UASTC, inspection | outil officiel libre, CLI ktx |
| [PlayCanvas Engine](https://developer.playcanvas.com/) | moteur 3D déjà utilisé, matériaux et chargements GLB | installé et versionné dans package.json |

Attention : l'add-on Blender historique de Poly Haven est un produit distinct payant. Les assets Poly Haven et la recherche API sont gratuits ; cet add-on n'est pas requis.

## Commandes disponibles pour l'agent de codage

- Recherche ciblée CC0 : npm run assets:search -- snow --type texture
- Recherche de modèle : npm run assets:search -- "pine tree" --provider polyhaven --type model
- Diagnostic des logiciels externes : npm run assets:doctor
- Contrôle des droits, du conteneur GLB et des tailles : npm run assets:audit
- Téléchargement reproductible du pack approuvé : npm run assets:alpine
- Inspection GLB avec glTF Transform installé : node scripts/asset_tools.mjs inspect mon-modele.glb
- Optimisation WebP sans modifier l'original : node scripts/asset_tools.mjs webp entree.glb sortie.glb
- Export d'une scène originale Blender : blender --background --python scripts/blender/export_glb.py -- --input atelier/skieur.blend --output atelier/skieur.glb

Aucun outil externe desktop n'est installé automatiquement sur l'ordinateur du joueur. Aucune clé de service, compte, abonnement ou appel d'API dynamique n'est ajouté au jeu. Les binaires de modèles futurs restent à importer puis vérifier individuellement.

## Priorité d'intégration pour Alpine Ski Pro

1. Athlète : créer un personnage original avec articulations, poids anatomiques, posture de course, vrais mouvements de départ, carving, saut, réception et arrivée ; conserver compatibilité de l'IK / replays.
2. Textures : neige damée photo-PBR réaliste (albedo sRGB, normale OpenGL +Y, roughness linéaire), rochers et bois ; respecter l'échelle réelle des UV.
3. Décors : vrais LOD par distance, instancing, limitation d'ombres et culling ; ne pas remplacer les règles de collision.
4. Formats GPU : KTX2 après configuration explicite du décodeur PlayCanvas et tests WebGL2/Safari/iPhone/WebGPU. Les JPG actuels restent le fallback stable.
5. Vérification : chaque nouveau fichier a un auteur, son URL originale, une licence contrôlée, sa taille, des tests et une entrée dans docs/ASSETS.md.

Ne pas aspirer en masse des bibliothèques Internet ni copier les fichiers et codes propriétaires de CarveMania. Aucun niveau de réalisme ni FPS ne peut être garanti par la seule présence de ressources externes.