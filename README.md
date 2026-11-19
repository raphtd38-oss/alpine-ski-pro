> V1.17.1 : correctif de chargement des sons optionnels absents, suite au contrôle de la version publique. Le lot physique V1.17 est décrit ci-dessous.

> **V1.17 — contact et forces (18 novembre 2026)** : carres issues du solveur, jambes indépendantes sur pente/dévers, pieds libérés du sol en vol, réception amortie, posture liée aux forces et traces sous les vrais skis. **42 portes reconstituées**, sunset par défaut, branches volumétriques et culling des portes lointaines. Les notes V1.15/V1.16 ci-dessous sont historiques. Voir [rapport, preuves et limites](docs/REALISM_2026_11_18.md). Les cinq vidéos utilisateur citées étaient absentes ; aucune fidélité à ces vidéos ni performance GPU joueur n'est revendiquée.

# Alpine Ski Pro — Super-G

**V1.15 Ultimate Realism Pass 1 · Cortina Olympia delle Tofane · Coureur monobloc 25 os · Super-G uniquement**

🎮 **[Jouer dans le navigateur](https://raphtd38-oss.github.io/alpine-ski-pro/)**

Alpine Ski Pro est désormais consacré **uniquement au Super-G olympique de Cortina 2026**, dans une reconstruction originale et schématique de l’Olympia delle Tofane. Les parcours et les choix de matériel SL, GS et DH ont été retirés du code actif et des menus à la demande du propriétaire. Le jeu reste un simulateur navigateur original basé sur PlayCanvas 2.24.1, TypeScript, Vite, un skieur GLB et une simulation de carving à 120 Hz.

## Départ et parcours

- Cabane de compétition avec côtés et arrière fermés, toiture à pans, habillage bois original et protections.
- Une tige de départ de 70 cm montée à 43 cm de la neige, déclenchement simulé à 20°, chronométrage au franchissement du portillon (non homologué).
- Trois doubles poussées liées à l'accélération physique, aux articulations et aux contacts des bâtons.
- Tracé Cortina 2026 reconstitué de 2 105 m et 635 m de dénivelé, avec 34 portes jouables de vitesse (4 piquets et 2 drapeaux chacune), marquages bleus, reliefs, compressions et sauts naturels.
- **Nouveau skieur monobloc 25 os**, 9 clips intégrés, combinaison PBR avec couleur par sommet, épaules/genoux/coudes sans discontinuité topologique et retarget des animations du jeu.
- **Skis 212 cm et chaussures directement attachés aux os des pieds**, sans doublons procéduraux visibles. Bâtons Super-G courbés et poussées déjà liées à la physique.
- Deux GLB originaux dans `public/assets/racer/` : **mobile 5,54 Mo** (bas/moyen, écran tactile), **full 17,26 Mo** (haut/ultra sur ordinateur). Une seule variante est téléchargée par session.
- Si le nouveau GLB échoue, repli automatique sur le skieur 18 os ; le fantôme utilise encore ce modèle léger. `?racer=classic` permet de tester l'ancien, `?racer=mobile` ou `?racer=full` force une variante.
- Neige/roches PBR, culling/LOD, records et replays préservés.
- Quatre caméras, météo et qualité graphique réglables, son, pause, entraînement, records locaux, fantôme et replays SG.

**Aucune ressource de CarveMania n'est copiée**, aucun appareil de chronométrage n'est certifié FIS et aucun photoréalisme ni FPS GPU n'est garanti.

## Commandes

| Entrée | Action |
|---|---|
| A / ← et D / → | Prise de carres |
| W / ↑ | Recherche de vitesse |
| S / ↓ | Freinage |
| Espace | Impulsion |
| C | Changement de caméra |
| R | Recommencer |
| Échap | Pause |
| Tactile / manette | Commandes de base (à valider sur chaque appareil) |

Choisir **Prendre le départ** ou **S'entraîner**. Les options graphiques, la météo et la couleur de combinaison sont conservées. Les préférences issues des anciennes versions passent automatiquement en Super-G ; les anciens chronos SL/GS/DH ne sont plus affichés. Les enregistrements SG existants conservent leur clé de sauvegarde.

## Développement et vérification

```bash
npm ci
npm run assets:alpine
npm run assets:audit -- --require-pack
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Le workflow [GitHub Actions](.github/workflows/ci.yml) vérifie le code, les assets autorisés, les tests et Chromium avant publication sur GitHub Pages. Les ressources 3D GLB et PBR approuvées restent chargées dans le navigateur.

## Documentation

- [État du développement](docs/STATUS.md)
- [Feuille de route](docs/ROADMAP.md)
- [Cortina 2026 : reconstruction du parcours, provenance et limites](docs/CORTINA_2026.md)
- [Départ FIS-inspiré V1.11](docs/V111_START.md)
- [Studio Kit 2026](docs/STUDIO_KIT_2026.md)
- [Licence et provenance des assets](docs/ASSETS.md)
- [Inventaire des moteurs, plugins et outils de développement](docs/TOOLS_AND_RESOURCES.md)
- [Outils 3D vérifiés](docs/RESOURCE_CATALOG.md)
- [Historique technique](docs/CHANGELOG.md)

### Nettoyage V1.12

Les cinq captures obsolètes de `docs/screenshots/` et l'ancien générateur `scripts/build_skier.py` ont été retirés. Ils ne faisaient pas partie du bundle de jeu. Git conserve l'historique ; **la suppression de fichiers ne rend pas ChatGPT moins limité**. La diminution réelle du poids à télécharger dépend surtout des modèles et des textures qui restent en production.

## Cortina Sunset — décor cinématique enrichi

- Massifs de dolomie rosée stratifiés et crêtes enneigées ajoutés autour de la piste.
- Sous-bois plus dense : grands épicéas, conifères sombres, mélèzes et branches poudrées de neige ; densité adaptée au niveau graphique.
- Fines rainures de damage qui suivent les virages de la piste, sans modifier le relief ou la physique.
- Filets A rouges à mailles visibles, plateformes TV, petit village alpin lointain avec fenêtres éclairées.
- Projecteurs LED déjà en place complétés par halos doux en lumière additive, reflets au sol conformes au relief et nuages roses dans le ciel sunset.
- Les 34 portes Super-G, les fanions souples, les collisions, les contrôles et les règles sont inchangés par cette extension visuelle.
- Décor entièrement procédural et original : l'image de référence est une direction artistique, **pas** une texture projetée ni une reconstruction GPS/photogrammétrique.

## V1.15 — Ultimate Realism, première passe

- Nouvelle biomécanique de transfert de charge : accélération latérale, flexion des genoux et bassin plus engagé, skis gauche/droit et dérive suivis indépendamment, uniquement dans le rendu 25 os.
- **15 vrais projecteurs spot** orientés sur la piste ; 1 à 4 lumières actives selon le niveau graphique, avec une seule ombre locale au maximum.
- Matériau calcaire PBR doté de micro-normales UV, gerbe de neige dépendante de la pression réelle sur chaque ski (correction du virage à droite).
- Les règles des portes flexibles et le seuil de chute strict **>45%**, la physique 120 Hz et le chrono restent inchangés.
- Voir [l'audit, les preuves et les limites de V1.15](docs/ULTIMATE_REALISM_V115.md). Aucun FPS réel ni rendu photo-identique n'est revendiqué.

## V1.16 — Cortina Visual Geology Upgrade (novembre 2026)

- Anciennes falaises artificielles cylindriques remplacées par des **parois rocheuses stratifiées** : crêtes dentelées sur plusieurs sommets, érosion et fissures, névés discontinus, teintes calcaires chaudes au sunset.
- Nouveau générateur géométrique pur et testable `src/render/cortina-geology.ts`, utilisé **à la fois** par les falaises proches du Schuss et par les massifs lointains. Un maillage groupé, qualité graphique adaptée, pas de nouvelle dépendance.
- Ajout de bourrelets de neige irréguliers **hors de la bande de course** sur les deux bords, conformes à la pente existante, `src/render/cortina-snow-banks.ts`.
- Forêts plus naturelles : troncs visibles, épicéas et mélèzes légèrement inclinés, avec leurs branches et dépôts de neige, tous regroupés par maillage.
- Aucun changement de skieur, portes, contact banderole, 45 %, chronomètre, enregistrement, tracé, physique à 120 Hz.
- L'environnement reste une reconstitution artistique et pas une photogrammétrie exacte de Cortina. Voir [notes V1.16](docs/CORTINA_VISUAL_V116.md).


### Extension visuelle Cortina 2026 — repères photographiques

Un nouveau module original de décor (`src/render/cortina-reference-landmarks.ts`) ajoute des falaises continues à strates, corniches enneigées, conifères et mélèzes hivernaux détaillés en premier plan, et éboulis le long de la piste de Super-G. La géométrie est regroupée et plafonnée selon la qualité graphique. Les images de référence fournies ne sont **pas** intégrées comme textures. Cette extension préserve les 34 portes, la physique à 120 Hz et la piste active ; il ne s'agit pas encore d'un terrain topographiquement exact. Voir `docs/CORTINA_2026.md`.


### Ambiance JO 2026 — ciel de jour fidèle aux photographies

Depuis cette extension, le rendu par défaut privilégie un ciel bleu diurne, un soleil neutre d'hiver, un brouillard d'horizon bleu et un éclairage ambiant naturel correspondant mieux aux photographies de Cortina lors des compétitions. L'ancien ciel rose de crépuscule et son éclairage ne sont pas supprimés : ajouter `?lighting=sunset` à l'URL pour les retrouver. Le profil de ciel est procédural (sans image ni HDRI copié) et les spots, les filets, les portes, la physique et le skieur restent en place. Ceci n'est pas une simulation de météo ou d'éphéméride exacte du 12 février 2026.
