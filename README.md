# Alpine Ski Pro — Super-G

**V1.12 · Glacier Express · 1 980 m · 34 portes**

🎮 **[Jouer dans le navigateur](https://raphtd38-oss.github.io/alpine-ski-pro/)**

Alpine Ski Pro est désormais consacré **uniquement au Super-G**. Les parcours et les choix de matériel SL, GS et DH ont été retirés du code actif et des menus à la demande du propriétaire. Le jeu reste un simulateur navigateur original basé sur PlayCanvas 2.24.1, TypeScript, Vite, un skieur GLB et une simulation de carving à 120 Hz.

## Départ et parcours

- Cabane de compétition avec côtés et arrière fermés, toiture à pans, habillage bois original et protections.
- Une tige de départ de 70 cm montée à 43 cm de la neige, déclenchement simulé à 20°, chronométrage au franchissement du portillon (non homologué).
- Trois doubles poussées liées à l'accélération physique, aux articulations et aux contacts des bâtons.
- Tracé original de 1 980 m, 34 portes de vitesse (4 piquets et 2 drapeaux chacune), marquages bleus, reliefs, compressions et sauts naturels.
- Skieur à 18 os et textures PBR originales, bâtons Super-G courbés, skis dynamiques, neige/roches PBR, culling/LOD.
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
- [Départ FIS-inspiré V1.11](docs/V111_START.md)
- [Studio Kit 2026](docs/STUDIO_KIT_2026.md)
- [Licence et provenance des assets](docs/ASSETS.md)
- [Outils 3D vérifiés](docs/RESOURCE_CATALOG.md)
- [Historique technique](docs/CHANGELOG.md)

### Nettoyage V1.12

Les cinq captures obsolètes de `docs/screenshots/` et l'ancien générateur `scripts/build_skier.py` ont été retirés. Ils ne faisaient pas partie du bundle de jeu. Git conserve l'historique ; **la suppression de fichiers ne rend pas ChatGPT moins limité**. La diminution réelle du poids à télécharger dépend surtout des modèles et des textures qui restent en production.
