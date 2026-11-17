# 🎿 Alpine Ski Pro — inventaire des outils, plugins et ressources

**Référence de développement : V1.13, Super-G uniquement · 17 novembre 2026**

- Dépôt : https://github.com/raphtd38-oss/alpine-ski-pro
- Jeu : https://raphtd38-oss.github.io/alpine-ski-pro/
- Document transmis par le propriétaire : « Alpine Ski Pro — Inventaire des outils, plugins et ressources » (référence initiale V1.12).
- Dernière vérification du code et des fichiers dans le dépôt : 17/11/2026 ; dernier workflow V1.13 de référence : https://github.com/raphtd38-oss/alpine-ski-pro/actions/runs/44154219947 (**success**).

## Lecture obligatoire des statuts

| Statut | Signification |
|---|---|
| **INTÉGRÉ / VÉRIFIÉ** | La ressource, le mécanisme ou le fichier est effectivement présent dans le dépôt ou vérifié par GitHub Actions. |
| **PLUGIN PRIVÉ CONFIRMÉ** | Le plugin ChatGPT est enregistré dans le compte ; cela **ne signifie pas** que Blender tourne sur la machine de l'utilisateur ni qu'il existe une session MCP active. |
| **CONNECTEUR DISPONIBLE** | Le service est connu des outils ChatGPT ; sa connexion OAuth, son accès à un compte et son utilité effective doivent être vérifiés avant usage. |
| **CATALOGUE / OPTION** | Logiciel, bibliothèque ou référence externe ; **non présumé installé, connecté, licencié ou intégré au jeu**. |
| **À TESTER / À DÉVELOPPER** | Présent partiellement, expérimental, ou objectif futur. |

La liste d'outils est une **boîte à outils**, pas une obligation de tout installer. Éviter d'ajouter plusieurs moteurs physiques/3D concurrents par principe : choisir le moteur et les dépendances sur la base des tests du simulateur.

## 1. Moteur 3D, physique et runtime

**INTÉGRÉ / VÉRIFIÉ**

- **PlayCanvas Engine 2.24.1**, moteur de rendu principal (déclaré dans \`package.json\`).
- **TypeScript 5.9**, JavaScript, **Vite 8**, Node.js/npm : code et chaîne de build.
- **Physique personnalisée du ski à 120 Hz** : gravité, dérapage, charge sur les carres, carving, sauts, réceptions et filet de sécurité.
- **WebGL 2** : chemin de rendu utilisé par les tests Chromium.
- **Ammo.js / Bullet WASM** : chargeur optionnel et capteurs/collisions de portes dans \`src/render/ammo-physics.ts\`. Le chargeur a un fallback et peut échouer côté navigateur ; **ne pas annoncer une physique Bullet complète ni une disponibilité garantie sans mesure d'exécution**.
- **WebGPU** : voie de création graphique conditionnelle avec vérification de l'adaptateur et retour vers WebGL 2, dans \`src/render/engine.ts\` ; résultats GPU matériels à confirmer.

**CATALOGUE / OPTION** : Rapier 3D Physics (moteur distinct de l'application ChatGPT « Rapier »), Three.js, Babylon.js, Unity, Unreal Engine, Godot. Ces solutions **ne remplacent pas** PlayCanvas dans le projet.

## 2. Plugin ChatGPT privé Blender MCP – Alpine Ski Pro

**PLUGIN PRIVÉ CONFIRMÉ** par Plugin Creator le 17/11/2026 :

- Identifiant : \`plugins_6afc86ee0178819193be642c81878ee0\`
- Nom : \`blender-mcp-alpine-ski\`, version \`0.2.0\`, portée personnelle \`USER\`, visibilité \`PRIVATE\`.
- Configuration locale : \`mcp.json\`, \`.mcp.json\` ; compétences \`skills/blender-game-assets/SKILL.md\` et \`skills/studio-3d-toolchain/SKILL.md\` ; références pour qualité Super-G et catalogue d'environ 38 outils.
- Rôle : consignes de modélisation, rigging, animations, PBR, validation GLB/glTF et intégration PlayCanvas.
- **Non vérifié :** connexion effective à l'application Blender sur un ordinateur, installation des dépendances locales et capacité de pilotage de cette instance par ce ChatGPT. Des fichiers MCP ne suffisent pas à garantir une session ouverte.

## 3. Connecteurs de ChatGPT

**Disponibilité possible selon connexion réelle et droits**, à contrôler avant toute action :
GitHub, ElevenLabs, Adobe, Canva, Figma, fal, Higgsfield, Runway, Replit, Lovable, Coder, Supabase, Notion, Listin3D, Rapier (documents/diagrammes), Google Drive, Google Docs, Google Sheets, Google Slides, Gmail, Google Calendar, Google Contacts, Todoist, Automations, Plugin Creator, Plugin Management.

- **GitHub** est utilisé pour lire, modifier, tester et publier ce dépôt. Le workflow Actions, et non la simple rédaction d'un prompt, fait foi pour une publication.
- ElevenLabs et les services créatifs sont des sources/outils de production **uniquement lorsque leurs connexions et droits sont effectifs**.
- Aucun de ces connecteurs n'installe automatiquement Unity, Maya ou Blender dans le jeu ni sur le PC.
- Aucun compte, abonnement ou paiement ne doit être créé sans action requise de son titulaire.

## 4. Modélisation / sculpture / personnages

**CATALOGUE / OPTION** : Blender, Autodesk Maya, ZBrush, Character Creator, Marvelous Designer, Houdini, Gaea, World Machine, OpenUSD.

Usages ciblés : corps humain avec topologie continue, combinaison et casque, chaussures, skis et fixations, montagnes, neige, décors et export glTF. Préférer le travail directement compatible avec les os, les UV et les conventions d'axes PlayCanvas.

## 5. Animation humaine et skieur professionnel

**INTÉGRÉ / VÉRIFIÉ, état V1.13 :**

- **Coureur monobloc à 25 os intégré** : 9 clips glTF fournis, corps continu, retarget du contrôle procédural et rotation d'axe \`-Z\` → \`+Z\`.
- Modèle \`public/assets/racer/seamless-full.glb\` (**17 259 488 octets**) et \`seamless-mobile.glb\` (**5 539 148 octets**) ; leur provenance et les empreintes SHA-256 figurent dans \`docs/ASSETS.md\`.
- Skis de compétition de **212 cm**, chaussures et fixations liés aux pieds. Départ avec poussées, positions sur les carres, saut/réception et arrivée pilotés par le jeu.
- Ancien skieur **18 os** conservé comme fallback et fantôme ; il ne doit plus être présenté comme le seul personnage actif.
- Animations **procédurales et originales, pas de motion capture professionnelle** ; les mouvements et les articulations restent à affiner.

**CATALOGUE / OPTION** : Blender Animation, Blender MCP / mcp-for-blender, Cascadeur, Rokoko, Adobe Mixamo, iClone. Droits/licences, conventions osseuses et qualité d'animation à vérifier avant import.

## 6. Textures, matériaux et habillage

**INTÉGRÉ / VÉRIFIÉ** : PBR, cartes albédo/diffuse, normales, rugosité et occlusion ambiante, combinaison de ski, neige damée, roches/granite et équipements. Les matériaux/UV existants sont documentés dans \`docs/ASSETS.md\` et \`docs/STUDIO_KIT_2026.md\`.

**CATALOGUE / OPTION** : Adobe Substance 3D Painter/Designer, Mari, Material Maker, ArmorPaint, Krita, GIMP. Pas d'installation implicite. Les marques et logos réels nécessitent les droits correspondants.

## 7. Optimisation, inspection et contrôle qualité

**INTÉGRÉ / VÉRIFIÉ** : GLB/glTF, scripts d'audit et de contrôle, recherche d'assets, LOD et culling de décors, résolution adaptative, tests de squelette/skinning et génération de l'ancien GLB de secours.

**CATALOGUE / OPTION** : glTF Transform, Khronos glTF Validator, Khronos KTX-Software, Meshoptimizer, MeshLab, Instant Meshes, Basis Universal.

**À TESTER** : pipeline KTX2/BasisU complet (encodage **et** décodage dans PlayCanvas), draw calls des deux skieurs monobloc, benchmarks réels PC/téléphone, performance de la végétation, taille téléchargée et mémoire GPU.

## 8. Bibliothèques d'assets et licences

**INTÉGRÉ / VÉRIFIÉ** : Poly Haven (neige PBR), Alpine Snow Village (neuf modèles CC0 d'origine), Studio Kit 2026 (sélection étudiée et réutilisée), GLB monobloc transmis par le propriétaire.

**CATALOGUE / OPTION** : ambientCG, Kenney, Quaternius, PureRef, Sketchfab, Poly Haven API, ambientCG API.

La présence d'un asset sur un catalogue ou l'étiquette « gratuit » n'autorise **jamais** à recopier sans vérifier licence, attribution, marques, redistribution, animation et contraintes d'hébergement. Toute ressource importée doit être traçable dans \`docs/ASSETS.md\`.

## 9. Programmation, tests et publication

**INTÉGRÉ / VÉRIFIÉ** : GitHub, GitHub Actions, GitHub Pages, Git, Node.js/npm, TypeScript, Vite, Vitest, Playwright/Chromium, Prettier, build et tests des assets.

Documents existants : \`AGENTS.md\`, \`README.md\`, \`docs/STATUS.md\`, \`docs/ROADMAP.md\`, \`docs/ASSETS.md\`, \`docs/RESOURCE_CATALOG.md\`, \`docs/ASSET_WORKFLOW.md\`.

**Dernier contrôle rapporté au 17/11/2026** : workflow de V1.13 terminé avec succès. Le résultat ne garantit pas la fluidité d'un GPU réel ; Chromium logiciel ne remplace pas une session de test joueur.

## 10. Audio et immersion

**INTÉGRÉ / VÉRIFIÉ dans les sources et documents** : Web Audio API, ski/vent/glisse synthétisés, ambiances, départ, bruitages d'impacts et mixage dynamique.

**Ressources ElevenLabs** : éléments déjà générés et documentés ; leur licence n'est pas automatiquement CC0. Toute nouvelle ambiance (carving, glace, rafale, foule longue) nécessite une génération puis l'intégration d'un vrai fichier audio ou d'une source synthétique testée, avec contrôle des droits et du volume sonore.

**CATALOGUE / OPTION** : Adobe, Runway, Higgsfield, fal pour préparer des médias compatibles quand les connecteurs sont accessibles.

## 11. Systèmes de jeu actifs et limitations

**INTÉGRÉ / VÉRIFIÉ** : Super-G « Glacier Express » de **1 980 m / 34 portes**, piste 3D sinueuse, crêtes/sauts, forêts/rochers/chalets, neige PBR, skieur 25 os (avec fallback 18), skis Super-G, bâtons courbés, cabane et tige de départ, chronométrage simulé, carres, dérapage, météo, projections/traces, caméras, records locaux, entraînement, fantôme, replays, HUD et audio.

**À TESTER / À DÉVELOPPER** : fiabilité réelle Ammo.js dans les différents navigateurs, ragdoll, motion capture de coureurs, IK/contact ski-neige avancés, déformation physique de la neige, benchmarks PC et mobile. Aucune homologation FIS ni performance AAA n'est revendiquée.

**Hors périmètre** : Slalom (SL), Géant (GS), Descente (DH) — supprimés depuis V1.12 à la demande du propriétaire.

## 12. Commandes de développement

\`\`\`bash
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
npm run assets
npm run assets:verify
npm run assets:alpine
npm run assets:search
npm run assets:doctor
npm run assets:audit
npm run studio:doctor
npm run studio:inspect
npm run studio:verify
npm run studio:optimize
\`\`\`

Ces commandes sont déclarées dans \`package.json\`. Certaines requièrent des logiciels locaux ou une connectivité externes ; leur existence ne signifie pas que toutes ont été exécutées ou que toutes leurs dépendances sont disponibles.

## 13. Instructions de développement — priorité permanente

1. **Améliorer directement le jeu**, pas seulement énumérer des outils. Conserver **PlayCanvas**, la simulation 120 Hz et Ammo.js là où il améliore les collisions sans casser la glisse.
2. **Un seul sport actif : le Super-G**. Préserver le parcours, la logique des portes, la cinématique de départ et le chronomètre. Aucune réintroduction des autres courses par défaut.
3. **Priorité au corps et aux mouvements** : anatomie continue, centre de masse, flexion des genoux, prise d'angle très basse, charge extérieure/intérieure, bras/bâtons, pointes des skis en contact et allongement vers la cellule d'arrivée.
4. Poursuivre le travail sur neige, matériaux, terrain et végétation **sans sacrifier la lisibilité ni la jouabilité**.
5. **Vérifier avant adoption** les formats GLB, joints, rotations/axes, animations, skinning, UV, textures, licences et coûts GPU.
6. **Ne pas copier** code ni modèles propriétaires de CarveMania. Les références servent à analyser des caractéristiques générales du ski, pas à extraire des ressources protégées.
7. **Avant publication** : tests unitaires, build TypeScript/Vite, tests navigateur, inspection des erreurs et conservation du fallback 18 os. Documenter ce qui est réellement mesuré et ce qui reste à vérifier.
8. Mettre à jour \`docs/STATUS.md\`, \`docs/ASSETS.md\` et la feuille de route après les évolutions significatives. **Ne jamais confondre disponibilité d'un plugin, installation locale et connexion effective.**

Voir aussi : \`docs/RESOURCE_CATALOG.md\`, \`docs/ASSET_WORKFLOW.md\`, \`docs/STUDIO_KIT_2026.md\` et \`docs/ASSETS.md\`.
