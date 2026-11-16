# Alpine Ski Pro

Un jeu de ski alpin original, entièrement dans le navigateur, construit avec **PlayCanvas Engine 2.24, TypeScript et Vite**.

**V1.1 : base de slalom jouable et testée, enrichie d'une nouvelle surface de neige, avec physique 120 Hz, carving progressif, caméra et animations plus souples, sons dynamiques et qualité graphique adaptative. La qualité n'est pas photoréaliste et les autres disciplines restent moins testées.**

🎮 **Alpine Ski Pro V1 publié** : https://raphtd38-oss.github.io/alpine-ski-pro/ — GitHub Actions a confirmé le déploiement réussi le 16 novembre 2026. Alternative de test navigateur via StackBlitz : https://stackblitz.com/github/raphtd38-oss/alpine-ski-pro?startScript=dev (compatibilité à vérifier selon le navigateur).

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

La branche `main` contient la version V1 une fois la PR de sortie fusionnée. **GitHub Pages est activé : la V1 a été déployée avec succès le 16 novembre 2026.** La connexion GitHub et le workflow ont reçu HTTP 403 lors de cette activation. Le workflow `Verify and publish` effectue l'installation reproductible, les tests unitaires, la compilation et les tests Chromium. Il publie ensuite `main` et la branche de développement lorsque la source Pages est activée ; les pull requests sont seulement vérifiées. Une PR permet de relire et fusionner le travail ultérieurement.

Lire [l'état de reprise](docs/STATUS.md), [les priorités](docs/ROADMAP.md) et [les crédits et licences](docs/ASSETS.md). Ne pas confondre un workflow en cours avec un déploiement déjà réussi.

## Mode Fluidité automatique (sans limite à 40 FPS)

La case **« Fluidité automatique »** est activée par défaut dans Paramètres. Le jeu laisse le navigateur afficher autant d'images que l'écran et le GPU le permettent : aucun verrou fixe à 40 ou 60 FPS. Si la cadence reste inférieure à environ 52 FPS, la résolution interne du rendu PlayCanvas baisse doucement (sans modifier la taille de l'interface, la physique à 120 Hz ni le niveau des décors) ; les ombres ne sont allégées qu'en dernier recours. Lorsque la fluidité remonte durablement, la résolution et les ombres reviennent progressivement vers la qualité choisie (Élevé par défaut). Des seuils et délais évitent les oscillations constantes. L'indicateur en course montre les FPS mesurés et le pourcentage de résolution par rapport au maximum choisi. La case peut être désactivée pour un rendu fixe.

Ce mode optimise la fluidité sans garantir un nombre de FPS sur un PC spécifique ; le navigateur, l'écran et l'accélération graphique restent les limites matérielles. Le nombre de FPS relevé dans Chromium avec SwiftShader n'est pas un benchmark GPU.

## Sons dynamiques de ski

La glisse, les carres de carving, le dérapage glacé et le vent sont maintenant mixés séparément suivant la vitesse et la trajectoire du skieur. Les boucles du menu, les impacts et le public de la première version restent disponibles. Quatre nouveaux MP3 peuvent être ajoutés dans `public/audio` pour remplacer automatiquement le rendu synthétisé ou la courte boucle du public. Les fichiers optionnels ne sont pas encore dans le dépôt : la tentative de génération ElevenLabs a été bloquée avant démarrage (voir `docs/ASSETS.md`). Sans MP3 supplémentaires, le jeu reste jouable et sonore, sans clé ElevenLabs ni installation.


## Nouveautés V1

- Transition des carres et animations du bassin/jambes/épaules plus progressives, appui extérieur relié à la flexion.
- Dérapage perceptible quand la demande de courbe dépasse l'adhérence, avec légère perte d'énergie (la physique reste simplifiée, pas certifiée).
- Cadrage caméra et champ de vision amortis pour éviter les à-coups.
- Qualité adaptative sans plafond à 40 FPS, calcul ski à 120 Hz indépendant du rendu.
- Mixage séparé glisse, carving, glace/dérapage et vent, avec l'ancienne musique et les impacts ElevenLabs.
- Quatre nouveaux MP3 ElevenLabs **non disponibles** : génération refusée avant démarrage car le service était occupé ; l'audio additionnel de la V1 utilise Web Audio en attendant (voir `docs/ASSETS.md`).

Les améliorations sont des travaux originaux. Rien de propriétaire n'a été copié depuis CarveMania.

## Mise à jour V1.1 : sensation de neige

Le damage de la piste utilise maintenant un matériau PBR procédural (albedo, micro-normales, rugosité) avec des bandes moins artificielles. Certaines zones compactées sont légèrement bleutées et offrent une adhérence un peu différente, cohérente avec la simulation à 120 Hz et le mixage des sons de carving. Un indicateur de neige en course aide à repérer ces zones. La variabilité est déterministe et volontairement modeste afin de conserver la jouabilité du SL. Les nouvelles générations ElevenLabs restent indisponibles, les sons Web Audio actuels restent présents.

## V1.2 — Carving, entraînement et replay

- **Entraînement guidé** : une trajectoire lumineuse originale traverse les portes ; elle n'apparaît qu'en mode entraînement et n'est pas un pilote automatique. Elle disparaît pendant les courses chronométrées et les replays.
- **Replay analysable** : barre de lecture, saut à un moment de la descente et vitesses 0,5×, 1×, 2× ; on peut toujours changer de caméra avec `C`. Les angles du skieur suivent le plus court arc, y compris aux passages angulaires +/-π.
- **Athlète plus détaillé** : inserts sur le masque et le casque, boucles des chaussures de ski, mouvements ponctuels des bâtons au changement de carre. Le personnage reste stylisé, mais ses accessoires et la gestuelle sont plus lisibles.
- **Projections de neige** : particules orientées vers la caméra, retombant sur la pente et affichées en quads translucides (au lieu de triangles rigides) ; niveau de qualité et cadence de mise à jour plafonnés pour éviter une baisse inutile des FPS.
- **Interface en course** : distance de la prochaine porte, contrôles de replay et compteurs existants conservés.
- **Compatibilité** : physique 120 Hz, quatre disciplines, scores, progrès, musique et sons actuels ElevenLabs préservés. Aucun nouveau son ElevenLabs revendiqué, les quatre fichiers complémentaires restent indisponibles.
- **Provenance** : code de trajectoire, détails visuels et particules créés spécialement pour ce jeu ; aucune réutilisation des fichiers propriétaires de CarveMania.

Le mode entraînement ne valide pas les résultats dans les records. Les performances graphiques et le réalisme doivent toujours être évalués sur une machine avec GPU réel.

## V1.3 — nouveau vrai modèle skieur de compétition

Le personnage de la V1.2 a été remplacé par un nouveau GLB original de skieur professionnel : combinaison ajustée rouge et noire, dossard blanc, casque aérodynamique, masque réfléchissant cuivré, gants, protections rigides et chaussures de course. Il possède **18 os**, **46 surfaces PBR** et un mélange de plusieurs os aux articulations : il **reste entièrement animé** pendant le carving, les changements de carre, le planté de bâton, la recherche de vitesse et les chutes.

Le haut du corps reste mieux stabilisé dans les virages, l'appui extérieur est davantage visible et les chutes sont amorties. La variation de couleur de la combinaison ne recolore pas les panneaux de compression noirs ni le dossard.

Aucun Blender ni téléchargement de modèle payant n'est nécessaire : `npm run assets` génère le GLB depuis `scripts/build_skier_pro.mjs`. `npm run assets:verify` vérifie le skinning. Le nouveau GLB de moins de 1 Mo est versionné dans GitHub et est chargé par PlayCanvas directement dans le navigateur.

Ce personnage est un modèle de compétition **plus réaliste en silhouette et équipement**, mais ne représente pas un scan photoréaliste de niveau AAA. La physique du jeu, les portes, les records, les replays et les commandes restent inchangés.

## V1.3.1 — équipement de slalom à l’échelle

Le modèle de skieur professionnel de la V1.3 est conservé, avec ses 18 articulations et ses animations. Un problème du panier de bâton a été corrigé : l'ancien objet mesurait **3 mètres** de large dans le code et pouvait dénaturer la silhouette en caméra rapprochée. Les nouveaux bâtons ont un panier d'environ 13 cm, une poignée et une pointe métallisée aux proportions réelles, ainsi que des protège-mains de slalom. Les dimensions sont définies dans `src/render/equipment-specs.ts` et contrôlées par les tests.

Tout reste accessible dans un navigateur sans Blender : aucune nouvelle dépendance ni texture externe, et les contrôles/chronos sont préservés.

## V1.4 — ambiance et portes inspirées d'une vidéo de référence fournie par le joueur

L'utilisateur a fourni un enregistrement de 55 s (1920 × 1038, 30 i/s, piste de **Giant Slalom**) montrant une piste ouverte dans une vallée enneigée, de grands massifs, des sapins foncés, des filets orange et des piquets rouges/bleus avec fanions. La V1.4 reproduit **des caractéristiques visuelles et de gameplay génériques**, pas les ressources du jeu filmé :

- **Fibreglass rouge/bleu** : textures procédurales originales sur les piquets en résine, avec dégradés, bandes de contrôle et renforts à la base.
- **Fanions GS/SG/DH** : nouveaux tissus signés ALPINE SKI PRO, courts et intégrés aux axes flexibles des piquets. Ils battent doucement et réagissent à leur torsion. Le **SL conserve ses simples piquets sans fanion**, comme dans les compétitions réelles.
- **Forêts** : épicéas plus verts et plus contrastés, avec neige placée sur certaines branches au lieu d'un rendu entièrement bleu-blanc.
- **Audio de contact** : petit craquement et résonance du piquet générés localement, renforcés par un froissement synthétique de tissu sur les portes GS/SG/DH. Le son original ElevenLabs `pole.mp3` reste superposé, sans reprendre celui de la vidéo.
- **Physique** : les pivots avec ressort et amortissement déjà présents continuent de contrôler la déformation visuelle et le léger échange d'impulsion; courses, algorithme de carving et timing inchangés pour préserver les records existants.

**ElevenLabs** : une génération originale *carving sur neige dure* de 7 s a abouti sur le flow existant (ID `twV2FljboNunWB9zOUVI`) mais le MP3 n'a pas pu être importé depuis son URL signée dans le dépôt. Le jeu utilise donc toujours son mixage local dynamique et ses sons ElevenLabs préexistants. Le son généré est disponible dans le compte ElevenLabs : https://elevenlabs.io/app/flows/3a7o6vXZTCRaMICykpbt .

Les assets du jeu filmé ne sont pas copiés et aucun photoréalisme AAA n'est annoncé.
