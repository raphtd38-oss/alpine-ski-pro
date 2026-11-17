# Alpine Ski Pro — instructions de reprise

## Objectif et continuité

Construire progressivement un vrai simulateur de ski navigateur, sans installation chez le joueur. Préserver PlayCanvas + TypeScript + Vite et les fonctionnalités existantes. Lire README.md, docs/STATUS.md et docs/ROADMAP.md avant de modifier le jeu. Ne pas repartir de zéro.

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
- Utiliser scripts/blender/export_glb.py pour les scènes originales, et scripts/asset_tools.mjs pour inspecter/optimiser les GLB lorsque ces logiciels sont disponibles. Tester toujours joints, animations, poids, UV et chargement PlayCanvas ; ne pas écraser le skieur original avant la compatibilité des courses.
- KTX2/BasisU et LOD dynamique nécessitent un chargement PlayCanvas / décodeur et des benchmarks GPU réels : ne pas simplement convertir les fichiers et déclarer le jeu optimisé.
