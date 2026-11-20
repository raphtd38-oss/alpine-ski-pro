## Lot graphique V1.18 — 19–20 novembre 2026

Lire `docs/references/graphics-v118/README.md` pour les preuves et le statut de publication. Les trois familles de falaises utilisent Rock Face 03 CC0 (manifestes/empreintes dans `scripts/alpine-pack.json`). Conserver l’orientation vers le ciel des deux bordures, le terrain raccordé sous les massifs à partir de 220 m de l’axe et les halos avec alpha. L’atlas d’éclairage ne doit pas réactiver le passage Skybox, qui masque le dôme. En Low, conserver les cartes PBR, les lumières directes et le remplissage ambiant uniforme ; les détails photo supplémentaires de la piste et l’IBL sont réservés à Medium/High/Ultra. Le terrain physique, le personnage et les portes ne sont pas remplacés.

## Mission active du 18 novembre 2026

Lire `docs/REALISM_2026_11_18.md` et `docs/references/2026-11-18/README.md` avant toute reprise. Priorité permanente : modifier réellement la physique et les mouvements, préserver le personnage 25 os, les portes élastiques et le seuil strict >45 %, tester les effets en jeu avant publication. Ne jamais assimiler un rapport historique au visionnage des vidéos : les cinq fichiers nommés n'étaient pas accessibles dans cette session.

Le tracé demandé comporte désormais **42 portes reconstituées**, distinctes des **43 portes officielles** du SG 2026. Les mentions 34 portes ci-dessous décrivent l'historique. Nouvelle clé de records `alpine-ski-pro:cortina-2026:42g-v2`, anciennes sauvegardes conservées. Le sunset redevient le défaut ; jour via `?lighting=daylight`. Ne pas réintroduire un angle de ski calculé indépendamment dans le rendu : utiliser les carres et directions physiques, en tenant compte du yaw 180° du GLB.

# Alpine Ski Pro — instructions de reprise

## Périmètre actif depuis V1.12

**SUPER-G UNIQUEMENT** : le propriétaire a demandé explicitement de supprimer SL, GS et DH. Ne pas restaurer les trois disciplines ni les menus associés sans nouvelle demande. Conserver la course SG Cortina 2026 de 2 105 m / 635 m (reconstitution schématique, 34 portes jouables), le chronométrage FIS-inspiré, le skieur, les records et replays SG, le moteur 120 Hz et la chaîne Studio Kit. Les anciennes descriptions de quatre disciplines dans les archives documentaires sont historiques, pas des exigences actives. Les anciens screenshots sont dans l'historique Git, pas dans l'arbre courant.

## Inventaire de production et critères de choix des outils

Lire **[docs/TOOLS_AND_RESOURCES.md](docs/TOOLS_AND_RESOURCES.md)** avant de rechercher ou brancher des moteurs, logiciels, plugins, rigs, textures ou sons. Ce document reprend l'inventaire transmis par le propriétaire et le confronte à l'état vérifié de **V1.13** ; la **V1.14** remplace Glacier Express par Cortina 2026.

- **Le skieur monobloc 25 os est désormais intégré dans le jeu** (`public/assets/racer/seamless-full.glb` et `seamless-mobile.glb`). L'ancien rig 18 os reste le fallback/fantôme : ne pas écraser ce progrès avec la version archivée V1.12.
- **Blender MCP – Alpine Ski Pro** : plugin privé personnel `plugins_6afc86ee0178819193be642c81878ee0`, version 0.2.0 confirmée ; **l'exécution d'une instance Blender locale n'est pas vérifiée**.
- Les logiciels de la liste sont des références potentielles, **pas des installations ou connexions acquises**. Vérifier chaque outil, droit et coût avant usage.
- Conserver PlayCanvas comme moteur et le solveur ski à 120 Hz ; tester Ammo.js et WebGPU en conditions réelles et ne pas introduire un autre moteur physique sans gain mesuré.
- Priorité : biomécanique et réalisme du coureur monobloc, prises d'angle très basses, neige et skis WC, animations de départ/arrivée, fluidité mobile/PC et licences.
- Ne jamais annoncer des intégrations, captures mocap, performances ou optimisations non vérifiées. Publier après tests.

## Objectif et continuité

Construire progressivement un vrai simulateur de ski navigateur, sans installation chez le joueur. Préserver PlayCanvas + TypeScript + Vite et les fonctionnalités existantes. Lire README.md, docs/STATUS.md, docs/CORTINA_2026.md et docs/ROADMAP.md avant de modifier le jeu. Ne pas repartir de zéro.

## Travail

- Branche de référence pour la V1 : main après fusion de release/v1-solid-base. Le workflow déploie cette branche pour les versions de développement, ainsi que main. Les modifications V1 explicitement autorisées peuvent être fusionnées après validation de CI ; documenter précisément la publication.
- npm ci ; npm test ; npm run build ; npm run test:e2e. Dans ce Cloud : CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e.
- Simulation pure à 120 Hz dans src/game. Ne jamais faire dépendre la physique du taux de rendu.
- Les collisions de piquets (src/game/poles.ts) et la validation des portes (race.ts) sont distinctes : un impact légal ne disqualifie pas.
- La vue est dans src/render ; l'interface et le profil dans src/ui et src/game/storage.ts.
- Les contrôles de test window.__ski n'existent qu'en mode Vite DEV, jamais en production.
- Toute ressource ajoutée doit être originale ou disposer de provenance/licence vérifiée, enregistrée dans docs/ASSETS.md. Les sons ElevenLabs ne sont pas CC0.
- Ne pas promettre un rendu AAA, une certification FIS, 60 FPS, ni un backend mondial non mesuré ou absent.
- Un test CPU/Chromium SwiftShader ne constitue pas un benchmark GPU joueur.
- Mettre à jour STATUS et ROADMAP après chaque session, avec le résultat des vérifications et les limites honnêtes.
- L'utilisateur autorise le développement et la publication de versions jouables sur ce dépôt. Continuer les améliorations demandées sans redemander cette autorisation.


## Ressources et outils de production 3D (référence permanente)

La sélection réelle du Studio Kit 2026 transmis par le joueur (11 GLB, 42 PBR, scripts, LOD) est documentée dans `docs/STUDIO_KIT_2026.md` : conserver les gains vérifiés, ne jamais réintroduire les terrains de démonstration comme terrain physique ou des modèles plus stylisés par simple nouveauté.

**Avant toute modification du rendu, des textures, d'un GLB, d'un rig ou d'une animation :** lire docs/RESOURCE_CATALOG.md, docs/ASSET_WORKFLOW.md, docs/ASSETS.md et scripts/alpine-pack.json. Ce sont les connaissances vérifiées du projet.

- Chercher les nouveaux modèles et textures **CC0** via npm run assets:search -- "snow" --type texture ou --type model. Les API publiques Poly Haven / ambientCG ne requièrent pas de compte ; Poly Haven exige un User-Agent identifiable et un crédit pour l'utilisation de l'API. Les téléchargements réels du jeu restent à versionner via des manifestes, pas au runtime.
- Tester npm run assets:doctor pour détecter Blender, glTF Transform, Khronos KTX-Software et le validateur GLB présents sur le poste. L'absence d'un outil facultatif n'empêche pas de tester la physique ; ne jamais prétendre qu'il est installé.
- Contrôler npm run assets:audit avant intégration et publication, étendre le registre des assets avec la provenance/licence de chaque nouveau fichier. Une désignation « free » ne vaut pas CC0. Respecter les restrictions exactes de Mixamo/Quaternius et ne pas créer de comptes/paiements sans intervention du propriétaire.
- Utiliser scripts/blender/export_glb.py pour les scènes originales, et scripts/asset_tools.mjs pour inspecter/optimiser les GLB lorsque ces logiciels sont disponibles. Tester toujours joints, animations, poids, UV et chargement PlayCanvas ; ne pas écraser le skieur original avant la compatibilité de la course SG.
- KTX2/BasisU et LOD dynamique nécessitent un chargement PlayCanvas / décodeur et des benchmarks GPU réels : ne pas simplement convertir les fichiers et déclarer le jeu optimisé.
