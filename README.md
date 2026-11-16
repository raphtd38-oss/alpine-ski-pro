# Alpine Ski Pro

Un jeu de ski alpin original, entièrement dans le navigateur, construit avec **PlayCanvas Engine 2.24, TypeScript et Vite**.

**Version 0.1.1 : première base jouable, pas le simulateur final ni un rendu photoréaliste.**

🎮 Adresse prévue : https://raphtd38-oss.github.io/alpine-ski-pro/ — **pas encore accessible**, activation de GitHub Pages nécessaire (voir ci-dessous).

## Jouer

Choisir **Prendre le départ**, attendre le compte à rebours, passer entre les deux piquets de chaque porte puis franchir l'arrivée. Freiner avant les virages serrés. Toucher un piquet avec le haut du corps peut être légal si les skis franchissent correctement la porte. Une porte manquée disqualifie la course, mais permet de terminer la descente.

| Commande     | Action                                     |
| ------------ | ------------------------------------------ |
| A / ←, D / → | Prise de carre gauche / droite             |
| W / ↑        | Position aérodynamique                     |
| S / ↓        | Freinage et dérapage                       |
| Espace       | Petite impulsion                           |
| C            | Caméra : poursuite, proche, subjective, TV |
| R            | Recommencer                                |
| Échap        | Pause / reprise                            |

Clavier recommandé. Commandes tactiles simples et manette (axe gauche, gâchettes, bouton A) disponibles mais pas encore validées sur matériel réel. La musique démarre après une première interaction, conformément aux règles audio des navigateurs. Paramètres → ambiance sonore coupe tout le son. `?quality=low` permet un démarrage direct en faible qualité.

## Fonctionnel

- Slalom de référence de 570 m et 22 portes, compte à rebours, temps intermédiaires, arrivée, disqualification et résultats.
- Physique indépendante du rendu à **120 Hz** : gravité sur le relief, inertie, direction des skis indépendante de la vitesse, carres progressives, force latérale limitée par l'adhérence, freinage, aérodynamisme, impulsion et équilibre simplifié.
- **Piquets articulés** : collision balayée, transfert d'impulsion, ressort à deux axes, amortissement et bruit d'impact ElevenLabs. Les règles de passage et les impacts sont séparés.
- Athlète **GLB original avec skin et 18 articulations**, matériaux PBR, flexion procédurale et IK sagittale à deux segments. Asset encore stylisé.
- Terrain partagé entre simulation et rendu, massifs, sapins, chalets, remontée, filets, corduroy de neige avec micro-normales, traces et projections.
- Aire d'arrivée rouge avec arche, tribunes, drapeaux, barrières, zone du leader et cabines. Présentation originale inspirée du ski de compétition, sans partenariat FIS/Audi.
- Quatre tracés SL / GS / SG / DH et quatre paires de skis dont les caractéristiques influencent la conduite ; seuls le slalom et ses règles ont un test de parcours complet à ce stade.
- Records locaux, fantôme du meilleur temps, replay de la dernière course ; entraînement sans inscription au classement.
- Profil, XP, niveau et jalons locaux ; couleurs de combinaison.
- Faible / moyen / élevé / ultra ; beau temps / couvert / brume neigeuse.
- Musique de menu, impacts et public **générés avec ElevenLabs**, téléchargés dans le dépôt. Vent/glisse/carres synthétisés en Web Audio.
- WebGPU avec shaders WGSL natifs PlayCanvas, détection des adaptateurs et repli WebGL 2 ; `?renderer=webgl2` force la voie de secours. Aucun service payant ni clé nécessaire pour jouer.

## Limites assumées

Ce n'est pas une simulation FIS homologuée. Le contact neige est un solveur personnalisé contraint au terrain, pas encore un moteur de corps rigides avec skis séparés, vrais contacts 3D ou ragdoll. Les sauts sont commandés, sans décollage automatique calculé sur chaque rupture de pente. La neige ne se déforme pas physiquement. Le GLB est riggé mais ses surfaces utilisent principalement un poids par os ; le skinning/blending artistique est à améliorer. Les autres disciplines partagent encore les règles de base.

La carrière complète, les championnats, les récompenses, les modèles humains photoréalistes, les accessoires multiples et le classement mondial validé côté serveur restent à construire. Les classements actuels sont uniquement locaux, modifiables par le navigateur, sans protection anti-triche. Les conditions météo et les skis sont mélangés dans le classement de chaque piste. Aucune mesure ne justifie une promesse de 60 FPS sur un PC donné.

## Développement dans le Cloud

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Le joueur n'a **rien à installer**. Ces commandes sont destinées à l'environnement de développement Cloud et aux GitHub Actions. Sur le Cloud fourni : `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.

`npm run assets` régénère le GLB avec Python standard. Le fichier généré est versionné, donc Python n'est pas nécessaire au build ni au jeu.

## Architecture

```text
src/game/       simulation, chronométrage, piquets, contrôles, sauvegarde, audio
src/render/     scène PlayCanvas, athlète, caméras, neige
src/ui/         menus, HUD, styles
public/assets/  GLB original
public/audio/   sons et musique ElevenLabs hébergés localement
scripts/        génération du personnage et inspection navigateur
 tests/         règles de simulation et tests Playwright
 docs/          état, feuille de route, provenance des ressources
```

Le moteur de ski utilise des unités SI. La simulation avance par pas fixes et le rendu interpole les positions. Les grosses interruptions sont plafonnées à 250 ms pour éviter une accumulation infinie ; un navigateur extrêmement lent ralentira donc le jeu plutôt que de rendre le solveur instable. Un onglet masqué met la course en pause.

## GitHub et publication

La branche `feat/playable-slalom` contient la version jouable. **Publication encore bloquée : l’activation de Pages exige le réglage propriétaire Settings → Pages → Source : GitHub Actions.** La connexion GitHub et le workflow ont reçu HTTP 403 lors de cette activation. Le workflow `Verify and publish` effectue installation reproductible, tests unitaires, compilation et tests Chromium avant d'autoriser GitHub Pages. Il publie cette branche de développement et `main` ; les pull requests sont uniquement vérifiées. Une PR permet de relire et fusionner le travail ultérieurement.

Lire [l'état de reprise](docs/STATUS.md), [les priorités](docs/ROADMAP.md) et [les crédits et licences](docs/ASSETS.md). Ne pas confondre un workflow en cours avec un déploiement déjà réussi.
