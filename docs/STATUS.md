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

## Amélioration proposée — 16 novembre 2026 (branche feat/realistic-snow-effects)

- Traces des deux skis désormais construites perpendiculairement à la trajectoire réelle, avec l'orientation de chaque ski aux échantillons successifs. Les sillons suivent mieux les grandes courbes et la pente.
- Suppression de l'allocation `Array.splice` à chaque segment de trace : écriture directe dans le tampon circulaire, sans modifier la physique ni les règles de portes.
- Projections de neige orientées dans le sens opposé au carving et vers l'arrière, émission limitée par le temps écoulé plutôt que par le nombre d'images, limite de particules selon la qualité graphique.
- Envoi du maillage dynamique des particules plafonné à 30 Hz, mise en veille lorsqu'il n'y a plus de projections, effacement des traces lors d'un saut/recommencement.
- Quatre tests unitaires ajoutés dans `tests/snow.test.ts` ; vérifier les résultats du workflow CI sur la PR avant fusion.
- Code original, aucun modèle, texture, son ou code tiers copié des dépôts GitHub consultés (leurs licences ne sont pas toutes permissives).
- **Non fusionné :** modification sur branche séparée pour revue ; ce travail ne constitue pas un rendu photoréaliste ni une validation FPS sur GPU réel.

## Lot de fluidité adaptative — branche feat/adaptive-high-fps (16 novembre 2026)

- Mode **Fluidité automatique** activé par défaut, désactivable en paramètres et mémorisé localement.
- Contrôleur purement visuel de résolution interne basé sur cadence mesurée, intervalles de 2 s, seuils distincts de dégradation et récupération et plancher raisonnable selon niveau graphique.
- Ajustement des ombres uniquement en dernier recours : détails de neige, personnage, pistes, arbres, collisions et règles de course sont conservés.
- **Pas de plafond de 40 FPS ou 60 FPS**, le navigateur choisit la cadence maximale effective. La physique reste sur son pas fixe de 120 Hz.
- Affichage FPS/résolution relative en jeu ; nouveaux tests de performance adaptative.
- Vérifier la CI et les performances sur GPU matériel avant de fusionner ; aucun FPS garanti.

## Audio immersif — branche feat/immersive-ski-audio

- Ajout d'un mixeur de sons de ski indépendant du moteur graphique : glisse, carving, glace/dérapage, vent. Intensités modulées par vitesse, prise de carre, glissement, type d'adhérence.
- Boucles Web Audio à filtres dédiés, transitions de volume douces, sons des piquets existants conservés avec panoramique.
- Chargement conditionnel de quatre futurs assets ElevenLabs : `carving.mp3`, `ice.mp3`, `wind.mp3`, `crowd-long.mp3`. Sans ces fichiers, le jeu fonctionne avec synthèse originale et l'ancienne ambiance public.
- Génération ElevenLabs essayée (flow documenté dans ASSETS) mais **refusée avant lancement : service occupé, zéro crédit consommé, aucun nouveau fichier livré**.
- Nouveaux tests de mixeur; CI à vérifier avant fusion. Aucun fichier additionnel ElevenLabs n'est revendiqué comme intégré dans cette branche.

## Préparation de la V1 jouable — branche release/v1-solid-base

- Réunit les évolutions de neige, performance et mixage audio issues des branches précédentes.
- Physique affinée : vitesse légèrement dissipée en dérapage et retour sonore/visuel plus sensible quand la prise de carre atteint la limite d'adhérence. Réglage conservateur pour préserver le slalom automatisé.
- Animations : inclinaison et position basse du skieur amorties sur le temps de rendu ; bras et skis suivent un appui cohérent.
- Caméra : focalisation et variation du champ de vision amorties pour réduire la sensation de tremblements.
- Numéro de version affiché : V1.0.0. Tests GitHub Actions à exécuter avant fusion sur main.
- Publication : source GitHub Pages à activer côté dépôt, sans pouvoir faire ce réglage avec les permissions du connecteur. Import StackBlitz possible comme solution de navigation provisoire, sous réserve de compatibilité du navigateur.
- Les quatre nouveaux fichiers ElevenLabs n'ont pas été livrés à cause de la saturation du service. Ne pas les annoncer comme intégrés.

## Livraison effective V1 (16 novembre 2026)

- Fusion de la V1.0.0 sur `main` avec PR #7 (SHA `d31e53f81c11cb951b6a2e5564cc5388cb689302`).
- Workflow GitHub Actions `43863934709` : tests unitaires, compilation, navigateur Chromium et déploiement GitHub Pages **réussis**.
- URL de test : https://raphtd38-oss.github.io/alpine-ski-pro/ . GitHub Actions rapporte un déploiement réussi ; retours de rendu/performance attendus de l'utilisateur sur GPU réel.
- Alternative navigateur : https://stackblitz.com/github/raphtd38-oss/alpine-ski-pro?startScript=dev (import public du dépôt ; compatibilité propre au navigateur non vérifiée).
- Quatre nouveaux MP3 ElevenLabs toujours indisponibles, le jeu utilise ses anciennes pistes ElevenLabs et ses bruitages ski de synthèse dynamique.

## Mise à jour piste et contact neige — 16 novembre 2026

- Nouveau champ de neige compactée/verglacée très progressif, déterministe et partagé entre simulation, rendu et son. Les zones sont visibles par une coloration légèrement bleutée et un indicateur sur le HUD.
- L'adhérence varie subtilement selon la position ; l'effet de neige fraîche reste distinct. Le pas de physique reste à 120 Hz, indépendant de l'affichage.
- Neige PBR générée localement : relief micro-normal plus fin, sillons de damage moins agressifs, carte de rugosité et matériaux conservés dans la gestion des ressources.
- Générations des quatre MP3 ElevenLabs réessayées une fois dans une nouvelle session, mais le service est encore saturé (« Free generations are busy right now ») ; aucun nouveau son disponible, aucun débit. Bruitages de synthèse toujours fonctionnels.
- Tests unitaires surface/texture ajoutés, et CI navigateur à vérifier avant publication.

## Mise à jour V1.2 — 16 novembre 2026

- Nouvelle trajectoire de référence calculée par interpolation cubique Hermite, rendue par un unique mesh translucide, activée **uniquement** en entraînement.
- HUD de prochaine porte, avec distance en mètres.
- Nouveau replay : sélecteur de vitesse 0,5× / 1× / 2×, chronologie et navigation ; rotation interpolée sur le plus court arc.
- Skieur : accessoires originaux liés aux articulations du GLB et gestes brefs de plantation du bâton en transition.
- Particules de neige : billboards face à la caméra, retombée sur le terrain, suppression des maillages vides, cadences/budgets préservés.
- Nouveaux tests unitaires trajectoire/replay, tests Playwright des contrôles de replay et du mode entraînement.
- Aucun code ou asset de CarveMania incorporé, aucun nouveau MP3 ElevenLabs. Tests et publication à vérifier avant annonce de disponibilité.

## V1.3 — refonte du skieur (16 novembre 2026)

- Nouveau skieur 3D construit et versionné, source JS reproductible dans `scripts/build_skier_pro.mjs`, GLB 18 os / 46 surfaces PBR / 13 matériaux.
- Peau multi-influences : épaules, hanches, coudes, genoux se déforment plus progressivement que l'ancien avatar monocouche.
- Équipement spécialisé : casque, masque miroir, dossard, protections tibias, chaussures et gants, combinaison à plusieurs matériaux préservée lors de la personnalisation.
- Animations existantes conservées et affinées : bassin, jambes indépendantes, torse stabilisé, chute interpolée.
- CI enrichie : régénération déterministe GLB, validation skinning/poids, tests navigateur de présence du squelette et des maillages ; vérifier statut vert avant toute fusion.
- Modèle original, pas de textures ou de personnages issus de CarveMania.

## V1.3.1 — corrections de l'équipement du skieur

- Panier de bâton en dimensions réelles : 0,13 m de diamètre au lieu du multiplicateur de 3 m.
- Pointe, poignée antidérapante et protège-main de slalom modélisés à partir de primitives PlayCanvas ; ils suivent l'animation des bâtons existants.
- Ajout d'un contrôle unitaire des dimensions des composants du matériel. Aucune modification aux forces physiques, au chronomètre ou à l'enregistrement des courses.
- Publication uniquement après succès de tous les tests GitHub Actions.

## V1.4 — référence vidéo CarveMania / Giant Slalom (16 novembre 2026)

- Vidéo utilisateur inspectée directement : 55,21 s, 1920x1038 à 30 i/s, son AAC, course Giant Slalom en montagne. Observations : piste large, massifs réalistes stylisés, forêt sombre, filets orange, portes rouges/bleues souples, traces sur neige, caméra arrière et chronométrage.
- Modification réelle `src/render/world.ts` : piquets à texture de fibre de verre, fanions ALPINE SKI PRO détaillés pour GS/SG/DH attachés aux charnières physiques, flutter dépendant de l'impact, sapins verts plus contrastés.
- Nouveaux modules `src/render/gate-textures.ts`, `src/game/gates-visual.ts`, `src/game/pole-sound.ts` ; calculs visuels et audio testés séparément.
- Mixage des impacts `src/game/audio.ts` : bruit de ressort et de contact original, variation de hauteur/volume avec vitesse; froissement synthétique pour drapeaux; ancienne piste ElevenLabs conservée.
- Une création ElevenLabs supplémentaire de carving de 7 secondes a abouti sur le flow de l'utilisateur (70 crédits). Le contenu audio n'a pas pu être téléchargé dans l'environnement de développement ; **ne pas prétendre qu'il est livré dans le jeu**.
- Tests CI (build et Playwright) à vérifier avant fusion/publication; aucune copie du code ou des assets du jeu de référence.

## V1.5 — carving, posture et piquets réactifs (branche feat/v15-carve-animation-gate-response)

Référence : vidéos fournies par le joueur le 16 novembre (55 s Giant Slalom et 36 s de la version de travail). Le jeu de référence montre des portes et pentes plus détaillées ; notre modèle original demeure stylisé.

- La distribution de charge gauche/droite progresse avec la vitesse, à pas fixe 120 Hz ; une réserve de force latérale modérée est associée à l'appui du ski extérieur.
- Un signal déterministe de « chatter » dépend de la dureté de neige, de la prise de carre et de la vitesse. La piste ne tremble pas aléatoirement ; les données sont propagées vers le personnage et les replays.
- La posture du GLB existant (18 articulations) bénéficie d'un bassin plus engagé, de deux jambes/chevilles aux angles différenciés, d'une compensation du haut du corps, d'un léger tremblement de carres et d'un recul bref lors du choc avec un piquet.
- Les piquets disposent d'une section supérieure élastique qui se déforme en plus de la charnière de base, avec ressort non linéaire amorti et retour contrôlé. Le passage de porte reste indépendant de l'impact.
- Mixage de neige dure légèrement plus granuleux ; aucun son propriétaire copié. La génération ElevenLabs `twV2FljboNunWB9zOUVI` de 7 s est confirmée existante mais non ajoutée au dépôt : accès aux octets MP3 non obtenu.
- Tests ajoutés pour pression extérieure, neige dure, collision et rétrocompatibilité des replays ; contrôle du nombre de sections de piquets dans Chromium.
- **Validation / publication :** se référer à la PR et aux checks GitHub Actions. Ce texte ne revendique pas la réussite des tests avant lecture de leurs résultats.
- Limitations : modèle 3D toujours procédural et semi-réaliste, non AAA. Aucune mesure de FPS sur GPU joueur ; l'animation des piquets ajoute un mesh léger par piquet.

## V1.6 — intégration sélective des fichiers ZIP et patch utilisateur

Source : `alpine-ski-pro-v1.5-fichiers.zip` et `alpine-ski-pro-v1.5.patch` fournis en conversation le 16 novembre 2026. Le patch cible la V1.4 et contient aussi des modifications V1.5 déjà développées sur main ; ces copies ne sont pas reprises littéralement pour éviter les régressions.

### Changements codés

- Hystérésis douce (`src/game/carving.ts`) : perte puis reprise de l'adhérence avec transitions amorties, sans remplacer l'appui extérieur V1.5 ; effet sur `slip` et sur l'énergie perdue.
- `pressure` calculé à partir des ondulations du terrain et répercuté dans la posture du skieur, son crouch et le champ visuel.
- Épaisseur `depth` de neige molle dans `sampleSnowSurface`, sensible près des filets et en météo neige ; effets sur freinage/adhérence et indication au HUD.
- Caméra : vitesse/FOV et micro-vibration du chatter ; position sans vibration mémorisée pour éviter la dérive caméra au cours des frames.
- Piquets : collision plus forte au centre, glissement latéral très limité, classification simple protection tibia / bras et vibrato de l'extrémité supérieure en plus de la charnière existante.
- Audio : `rattle` et `powder` générés par Web Audio ; variations de choc selon la zone de contact. MP3 ElevenLabs carving 7 s toujours **non intégré**.
- Pose V1.5 à 18 articulations, replays et tracés conservés ; nouvelles données skid/pressure optionnelles dans les replays.
- **Validation** : lire le résultat du workflow CI et de GitHub Pages, non présumés ici.

### Limites

Le moteur reste un compromis de jeu navigateur (pas solveur FIS), le modèle de skieur original est toujours stylisé, et l'amélioration vidéo/photo n'est pas une refonte graphique AAA. Les fichiers de l'autre proposition contenaient plusieurs moteurs entiers concurrents : seules leurs meilleures idées compatibles ont été retenues.

## V1.7 — Super-G Coupe alpine

Références : vidéos joueur de 55 s (Giant Slalom Switchback B) et 36 s (version du jeu), règles internationales FIS ICR (édition décembre 2024, §§680/690/1001) et guide FIS de diffusion des épreuves de vitesse. L'extrait CarveMania fourni montre un skieur animé, une forêt sombre, de la neige damée, des filets orange et des portes en tissu, mais ne documente pas le comportement de son moteur de physique ni son code de départ. Aucune imitation de ses assets.

**Travail codé** : extension SG à 1980 m, 34 portes et reliefs `src/game/superg.ts`, lancement sur crête/dynamique balistique `physics.ts`, quatre piquets plus deux fanions par porte de vitesse, chalet et tiges chronométriques `world.ts`, impulsion sur bâtons et geste de fin dans `athlete.ts`/`main.ts`. Marquages bleus originaux en approche des crêtes.

Le sol simulé et le rendu restent basés sur une seule fonction de hauteur continue, à 120 Hz pour la physique. Les dispositifs de porte sont des approximations visuelles de compétition et ne sont **pas homologués FIS**. Le modèle original 18 articulations reste semi-réaliste ; la pose des épaules est une animation procédurale, pas une simulation anatomique rigide.

**Publication :** vérifier les checks CI Playwright et l'exécution GitHub Pages de main après fusion ; ne pas déclarer les étapes réussies sans résultats.

## V1.8 — relief, tracé sinueux et chrono final

Le 16 novembre 2026, à partir de la photo Saalbach 2025 et des demandes du joueur :
- `courseCenterX` partage le tracé entre terrain de jeu, limites physiques, neige molle, filets, roches, forêt et portes. Les distances entre portes SG varient d'environ 33 à 70 m.
- Quatre secteurs visuels (forêt / glacier / combe rocheuse / arrivée) et végétation plus naturelle sur une seule géométrie groupée. De la teinture bleue est ajoutée en bords de piste et aux crêtes.
- Tissus de portes refaits comme surfaces incurvées, texture originale haute définition (512→1024 × 512), sans copie d'autre jeu.
- Nouvelle façade de la cabane de départ à panneaux de protection et affichage, et tige du chronomètre qui pivote au passage.
- Le geste d'arrivée a changé : extension de la main basse en direction du faisceau, au lieu d'un bras levé après l'arrivée. Le résultat est interpolé au sous-tick via `finishBeamFraction` et n'est validé qu'après la traversée de la ligne par le skieur. Replays anciens compatibles.
- Les règles de dimension / intervalle SG sont inspirées du règlement FIS 2026 et les marquages bleus d'explications FIS, sans utiliser d'assets ni marque propriétaire.
- Validation et publication : se référer à la PR, aux checks CI et à GitHub Pages, jamais supposer succès ou FPS non mesurés.
- Limite : le modèle GLB 18 articulations et les arbres procéduraux restent semi-réalistes. Pour une marche graphique qualitative supérieure, fournir/modéliser un skieur humain riggé original, textures PBR et mouvements professionnels capturés ou animés, puis optimiser GLB/KTX2/LOD dans PlayCanvas.

## 16 novembre 2026 — premier lot d'assets 3D CC0

Le moteur est raccordé à 9 modèles GLB Alpine Snow Village et 3 cartes PBR Snow 02 (Poly Haven), avec origine et droits dans ASSETS.md. Les chalets primitifs sont remplacés lorsque les modèles sont disponibles, des arbres et rochers détaillés enrichissent les abords de piste, et la forêt procédurale groupée assure un fond à moindre coût. Le niveau de qualité limite les instances et les ombres.

Les téléchargements doivent réussir dans GitHub Actions pour être présents dans l'artefact publié ; sinon les décors d'origine restent utilisables. Le skieur, la physique déterministe, le chrono et les collisions ne sont pas modifiés. Le skieur photoréaliste, les animations mocap, les textures KTX2 et le LOD dynamique ne sont pas encore livrés. FPS réels non mesurés.

## 16 novembre 2026 — boîte à outils 3D et ressources pour les développeurs

Ajout de docs/RESOURCE_CATALOG.md (Poly Haven, ambientCG, Kenney, Mixamo, Quaternius, Blender, Material Maker, glTF Transform, Khronos) et docs/ASSET_WORKFLOW.md. AGENTS.md et .github/copilot-instructions.md demandent aux futurs développeurs d'utiliser cette connaissance. Scripts disponibles : recherche API CC0 sans compte, audit hors ligne des GLB/licences/poids, diagnostic des logiciels locaux, optimisation GLB non destructive via CLI facultative, export GLB Blender en batch. Des commandes npm rendent ces aides accessibles ; la CI exige désormais le pack CC0 complet et un audit avant compilation.

Ce lot outille les prochaines améliorations mais n'importe pas un nouveau skieur photoréaliste, de nouveaux clips mocap, un transcodeur KTX2 ou un logiciel installé sur l'ordinateur du joueur. N'annoncer un déploiement réussi qu'après vérification GitHub Actions.

## V1.9 — 17 novembre 2026 — tracé SG et vrai habillage du skieur

- Correctif `superGGateZ` : 34 portes SG avec séparation longitudinale minimale de 36 m ; aucune porte placée dans une zone de 18 m avant l'appel ou de **80 m après** les cinq crêtes importantes. 80 m est une marge originale de conception du jeu, **pas une prescription FIS**. Le tracé garde ses secteurs boisés/glaciaires et ses virages.
- Nouveau dessin de teinture bleue : lignes latérales légèrement irrégulières, pulvérisation translucide texturée et marquages transversaux aux approches des cinq sauts ; un mesh unique dans PlayCanvas, sans emprunt d'assets.
- Le générateur d'athlète `scripts/build_skier_pro.mjs` produit de vraies UV et des textures PNG intégrées à la GLB pour combinaison bleu nuit, panneaux extensibles, carbone, dossard 61, casque/masque. Atlas générés par `scripts/racer-textures.mjs`, compatibles rendu hors-ligne.
- Le test de génération GLB est désormais exécuté avant chaque `npm test`, et des assertions contrôlent les cartes couleur et UV ; les tests de course, de chute, de replay et de pilotage restent inchangés sauf l'espacement SG.
- **Validation** : consulter les tests GitHub Actions de la PR et le déploiement `main` ; aucun FPS joueur ou certification FIS n'est présumé ici.
- **Limite** : modèle 18 os encore anatomiquement simplifié, aucun clip mocap ; textures réelles mais procédurales, pas une refonte réaliste complète.

- Amélioration après contrôle des captures Chromium : caméra de poursuite SG corrigée après interpolation pour éviter de passer sous les crests et d'exposer le fond bleu ; skis orange prototype remplacés par un topsheet de course texturé marine/carbone, avec UV et nettoyage des textures.

## 17 novembre 2026 — V1.10 Studio Kit (validation à vérifier sur GitHub Actions)

- ZIP Studio Kit 2026 fourni par le joueur inspecté : onze prototypes GLB, sept ensembles PBR (42 images), outils de génération, contrôle budgétaire, LOD, guides. Rapport dans `docs/STUDIO_KIT_2026.md` et empreintes SHA-256.
- Intégration réelle du LOD spatial : modèles GLB CC0 existants masqués en dehors de leur proximité caméra selon le niveau graphique, hystérésis de 12 m, évaluation toutes les 0,22 s ; la forêt groupée et le terrain physique restent actifs.
- Les rochers de bord de piste Super-G sont désormais regroupés sur un matériau granite/ardoise qui reçoit de vraies UV, des normales calculées et de la rugosité produite à partir du Studio Kit (`studio-rock-texel.ts`). Vérifier la lisibilité de la couleur et du relief en navigateur.
- Correction des couleurs du terrain : les bordures neige/rochers suivent à nouveau le centre réel des grandes courbes Super-G, et les secteurs glaciaires/combe rocheuse reçoivent une variation subtile de teinte sans modifier la physique.
- Le skieur GLB original reçoit des normales OpenGL dérivées de micro-reliefs de tissu, des cartes roughness/metallic et AO emballées en ORM glTF. Aucun téléchargement supplémentaire ni changement du rig.
- Les cristaux de neige réagissent à la compression de réception, avec de courtes gerbes après un saut, même skis droits, en plus du carving ; budget de particules bas maintenu.
- Le suivi caméra SG corrige aussi les grands déplacements instantanés liés aux replays et à la simulation rapide en sautant vers le skieur, sans perturber le suivi fluide d'une course normale.
- Tests ajoutés pour hystérésis de LOD, seuils de distance et amplitude des gerbes. Le moteur de simulation conserve son pas fixe de 120 Hz.
- Aucun modèle du kit plus stylisé n'a remplacé un GLB ou la neige photo-PBR existante ; aucun code ni asset d'autre jeu.
- Tests et publication : consulter le workflow CI et la PR ; ne pas présumer de FPS ou de compatibilité Safari non mesurés.
