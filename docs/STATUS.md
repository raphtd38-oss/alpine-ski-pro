# État de reprise — 15 novembre 2026

## Session 1 / version 0.1

Dépôt : `raphtd38-oss/alpine-ski-pro`. Branche de travail : `feat/playable-slalom`.

### Réalisé

- Projet PlayCanvas 2.24.1 / TypeScript strict / Vite 8, dépendances verrouillées.
- Boucle de slalom jouable : départ, contrôle du skieur, 22 portes sur 570 m, intermédiaires, DQ, arrivée, résultat.
- Solveur ski personnalisé SI à 120 Hz, inclinaison progressive, inertie, gravité terrain, drag/tuck, freinage, petite impulsion, chute simplifiée et filet.
- Piquets avec collision balayée, articulation ressort/amortisseur, impulsion réciproque et sons.
- GLB original riggé à 18 articulations, animation procédurale et IK sagittale. Correction effectuée sur le signe de l'angle du mollet ; ce modèle reste stylisé.
- Scène alpine procédurale avec neige, traces, spray, arbres, massifs, chalets, filets, remontée et grande arrivée rouge avec tribunes et zone du leader.
- Menus français, HUD, quatre modes caméra, quatre qualités, trois météos.
- Quatre tracés et quatre équipements, couleurs de combinaison, profil XP, records locaux, fantôme et replay.
- Trois fichiers ElevenLabs générés et intégrés : impact, musique 30 s, public 2 s. Sons de glisse synthétisés. Attribution/provenance dans ASSETS.
- GitHub Actions : tests + build + tests navigateur avant publication Pages de main ou feat/playable-slalom.

### Vérifications de cette session

- **13 tests unitaires passent** : cohérence à 30/60/144 FPS, énergie/freinage/tuck, inertie, équipement, saut, filet, portes interpolées, disqualification, replay et course SL complète ; collisions/retour élastique des piquets.
- **2 tests Playwright passent** dans Chromium, rendu WebGL 2 logiciel SwiftShader : contrôles réels clavier, pause, reprise, changement d'équipement ; course complète via les mêmes entrées physiques, résultat sauvegardé et replay. Durée locale : environ 52 s après réglage de la résolution de test.
- Compilation TypeScript/Vite réussie. Bundle moteur+jeu ~2,24 Mo non compressé / 581 Ko gzip ; avertissement de taille Vite connu, pas une erreur.
- Images de travail dans docs/screenshots et captures finales générées en artefacts Actions.
- Les grosses pauses sont plafonnées à 250 ms ; aucune garantie FPS. Les tests de navigateur ne constituent pas une mesure sur GPU de joueur.

### Publication

Consulter le workflow `Verify and publish` pour le résultat exact du dernier déploiement. Adresse prévue : https://raphtd38-oss.github.io/alpine-ski-pro/ . Une mise à jour de cette note précisera la vérification du lien public après déploiement.

### Prochaine reprise

1. Lire AGENTS.md, README et ROADMAP ; inspecter le dernier SHA et les changements locaux.
2. Tester le lien public et recueillir les retours du joueur. Garder cette architecture.
3. Priorité sensations et personnage : modèle humain/skin continu, IK 3D, transitions et contacts des skis ; ne pas masquer ces limites derrière des effets graphiques.
4. Raffiner les piquets (tibia/main, fût flexible), l'atmosphère et les infrastructures d'arrivée.
5. Vérifier WebGPU sur un GPU compatible, manettes et autres parcours. Seul le SL a un parcours complet testé automatiquement.
6. Compléter les systèmes de carrière ; actuellement profil/XP/jalons seulement, sans championnat ni économie.

Le projet n'est **pas terminé**. Pas de certification FIS, pas de sponsoring Audi, pas de promesse AAA/60 FPS, pas de classement mondial ou backend. Aucun travail de développement ne continue automatiquement entre les sessions ; seules les Actions déclenchées s'exécutent réellement.

## Reprise du 16 novembre — version 0.1.1

- Renforcement du carving : vraie influence de la charge extérieure, flexion filtrée, effet de longueur et limite de force latérale totale. Déformation visible des deux skis et flexion stockée dans les nouveaux replays.
- Normales de neige procédurales, granite exposé, chronomètre réel sur l'écran d'arrivée, transition de pente vers le dégagement, tribunes ajustées au sol.
- Préférences conservées, récupération de stockage corrompu, navigation mobile, différences au record aux intermédiaires ; nettoyage des matériaux lors des reconstructions.
- **19 tests unitaires réussis** ; la course complète reste valide après le changement de physique. Les **2 tests Playwright passent sur ce lot** (50,5 s) : clavier/pause/reprise/équipement et course complète avec record/replay. Contrôles visuels de production et mobile effectués.
- Essai WebGPU logiciel : le périphérique démarrait mais échouait aux allocations. Ajout d'une sonde d'adaptateur/allocation et du repli WebGL 2. Le test avec WebGPU exposé choisit maintenant WebGL 2 et termine les 22 portes sans erreur. **Rendu WebGPU sur GPU matériel toujours à valider** ; ne pas confondre détection et validation de rendu.
- Capture de l'arrivée et capture mobile dans docs/screenshots. Le script `scripts/verify-runtime.mjs` permet de les renouveler.
- GitHub Actions a confirmé installation, 13 tests de la version initiale, build et 2 tests navigateur réussis sur ses machines. La tentative configure-pages a échoué HTTP 403. Activation Pages toujours nécessaire dans https://github.com/raphtd38-oss/alpine-ski-pro/settings/pages ; Source = GitHub Actions. Après activation, relancer le job deploy ou pousser un nouveau commit.
- PR de suivi : https://github.com/raphtd38-oss/alpine-ski-pro/pull/1 . Pas de fusion automatique.
- Build de production vérifié dans Chromium (WebGL 2) : HUD actif, chronomètre en marche, aucune erreur JavaScript et aucun accès `window.__ski` dans le bundle. Capture `production.png` et navigation mobile `mobile.png`.
