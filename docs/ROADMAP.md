# Après PR #47 — améliorer le skieur sans casser l'IK (21 novembre 2026)

Les commandes à l'écran, la contre-angulation et le calcul 3D des appuis ont fait l'objet de la [PR #47](https://github.com/raphtd38-oss/alpine-ski-pro/pull/47), avec tests réussis. La pose visible dans les captures navigateur est **encore trop stylisée** pour l'objectif de simulation de Super-G ; ne pas présenter ce résultat comme AAA ou biomécaniquement validé.

**Prochaines améliorations à faire en priorité :** enregistrer une séquence réelle du skieur en virages à vitesse de course avec angles latéraux avant/arrière ; calibrer les repères mécaniques du GLB (axes hanche/genou/cheville et pivots de fixation), améliorer la flexion longitudinale du tibia et la contre-angulation des épaules en conservant la fermeture des contacts ; comparer images avant/après au même temps, vitesse, carre et caméra ; tester l'appui en vitesse lente et rapide et les réceptions ; mesurer les FPS sur GPU iPhone/PC et ajuster le niveau graphique. Ne pas rebasculer vers l'ancienne rotation libre du genou qui ignorait le contact exact du ski.

---

# Suite à la reprise Codex Astra — 21 novembre 2026

La caméra télévision à neuf plans et la posture aéro visuelle issues de l'ancienne PR #40 ont été adaptées, testées et publiées via la PR #46 ; l'ancien plan #39 de 42 portes est supersédé par le tracé jouable actuel. [Statut détaillé](STATUS.md).

**Encore à réaliser** : vérification de fluidité et de qualité sur GPU PC et iPhone, comparaison du coureur et des caméras à une référence vidéo accessible, géographie de Cortina fondée sur données réellement licenciées et mesurées, végétation/LOD spatiale et éventuelles animations mocap sous licences compatibles. Ne pas revendiquer de positions officielles des 43 portes FIS ni de rendu photoréaliste sans mesures et sources ; préserver le solveur 120 Hz, le rig 25 os, les 42 portes de jeu et le seuil de chute >45 %.

---

# Après le lot graphique V1.18 — 20 novembre 2026

- Publication V1.18 vérifiée sur le site public (PR #45, fusion `5e8f1fe`). Mesurer ensuite les performances réelles sur GPU PC/mobile ; le cloud utilise SwiftShader et son banc révèle un coût de rendu supérieur.
- Les cartes roche photo-PBR, l’éclairage d’environnement, la neige damée et les erreurs de normales/halos sont traités dans [ce lot](references/graphics-v118/README.md).
- Poursuivre la géométrie naturelle des massifs et les silhouettes de végétation ; établir un terrain géoréférencé uniquement avec données et licence vérifiées. Découper les grands lots de décor en secteurs/LOD et mesurer le bénéfice.
- Comparer les mouvements aux vidéos utilisateur lorsqu’elles sont accessibles, en préservant le contact des skis, le coureur et les 42 portes.

Les paragraphes suivants sont historiques et ne rétablissent ni les anciennes disciplines ni le tracé à 34 portes.

---

> **18 novembre 2026 — priorité immédiate, skier physics (branche feat/sg-physics-biomechanics-20261118)** : contrôle gauche/droite corrigé, carving plafonné par l'adhérence au lieu d'inventer un dérapage permanent, accélération latérale réelle fournie à la pose 25 os, flexion et angles de carre plus marqués et replays enrichis sans casser les anciens. À suivre : CI complète, test manuel de virages alternés, contacts des skis en position très basse sur PC/iPhone et réglage par vidéo comparée à la référence fournie. Ne pas qualifier cette animation de mocap ou de copie du code d'un jeu tiers.

# Feuille de route persistante

> **18 novembre 2026 — refonte Cortina photo-référencée (branche PR #34) :** nouveau module de parois dolomitiques, neige sur strates, épicéas/mélèzes, éboulis et LOD de scène intégré à PlayCanvas. Les photos servent de direction artistique seulement. **Étape suivante prioritaire :** obtenir et licencier un DEM admissible (GLO-30 autorisé ou autre source), établir des points géodésiques de contrôle, produire une topographie de massifs avec relief continu et un corridor piste unique physique/rendu ; auditer l'alignement géographique des secteurs Schuss, Duca, Delta et Scarpadon. Ajouter seulement des assets PBR et photogrammétrie dont la provenance, la redistribution et les budgets WebGL2/iOS sont vérifiés. Pour chaque changement, comparer captures et retours de pilotes à la vidéo réelle, vérifier les 34 portes et mesurer les performances du GPU avant fusion.


> **Après V1.16** : comparer plusieurs captures de la piste réel/jeu, améliorer l'axe topographique par DEM ouvert sous licence compatible, remplacer/compléter les surfaces rocheuses par PBR photo haute résolution et LOD, mesurer l'impact GPU de la forêt et des montagnes sur iPhone et PC, corriger l'ambiance de ciel trop uniforme aux endroits où des visuels antérieurs montrent une arche rose artificielle. Priorité à la fidélité des vrais virages et à la fluidité.\n\n

> **Après V1.15** : calibrer biomécanique sur des vidéos autorisées (squat, chargement ski extérieur, angles skis/sol), mesurer les performances GPU sur iPhone/PC, améliorer l'ombrage des arbres, asset LOD de montagne, la neige PBR et les ombres des spots sur tous les profils. Ne pas confondre rendu Chromium et vrai benchmark GPU. Voir docs/ULTIMATE_REALISM_V115.md.\n\n
> **Décor visuel Cortina enrichi :** détails rapprochés de dommage neige, filets rouges et pylônes éclairés, plus montagnes, résineux et village en arrière-plan. À tester ensuite sur iPhone / PC : nombre de triangles visibles, lumière des pylônes, détails près du skieur, densité forêt, lisibilité des portes et comportement du ciel en caméra subjective. Les différences photo↔moteur restent importantes car il n'existe ni DEM officiel, ni textures/scans locaux de Cortina dans le projet.\n\n

> **Extension crépuscule Cortina :** ciel dégradé procédural, lumière solaire basse, lampes LED et effets lumineux locaux limités selon le niveau de détail ; placement des portes plus rythmé dans les courbes. À vérifier encore : performance mobile WebGL/WebGPU, perception du relief sous le soleil bas, comportement des vraies sources omni et ergonomie des portes sur toute la descente.\n\n
> **Priorité actuelle V1.14 : Cortina Olympia delle Tofane (2 105 m, 635 m) uniquement, avec le coureur monobloc 25 os conservé.** Les anciens chapitres parlant de SL, GS ou DH constituent une archive des versions précédentes ; ils ne sont plus au périmètre du jeu. À présent : améliorer le départ, le rig et les proportions du skieur, les poses sur les carres, la neige, l'environnement et le temps de chargement, sans recréer d'autres disciplines.

Référence technique actualisée : [inventaire des outils, plugins, ressources et statuts](TOOLS_AND_RESOURCES.md). Les entrées historiques ci-dessous peuvent évoquer des versions antérieures ; ne pas les interpréter comme des fonctions actives.

Le but est un simulateur de ski de grande qualité, amélioré sur le même dépôt à chaque session. Aucun travail autonome entre sessions n'est promis.

## Priorité 1 — sensations et règles

- Faire essayer le **Super-G de Cortina 2026** au joueur et recueillir ses sensations sur les prises d'angle, la vitesse, les transitions, les sauts et le freinage.
- Définir un mode accessible et un mode course exigeant ; conserver les tests de parcours valides.
- Raffiner contacts séparés des skis et charges intérieures/extérieures, flexion dynamique plus détaillée (déformation visuelle déjà présente), conservation d'énergie et décollage sur relief.
- Calibrer les piquets sur des valeurs documentées ; distinguer contacts skis / tibias / mains / corps, plier le fût en plus de l'articulation.
- Vérifier la règle de passage des deux skis et pieds sur plusieurs trajectoires, portes verticales, doubles et figures ; ne pas annoncer conformité FIS sans validation.
- Ajouter collisions avec obstacles, réaction corporelle et ragdoll avec un moteur physique navigateur approprié, sans casser le solveur de carving.

## Priorité 2 — athlète

- Améliorer le **nouveau GLB monobloc 25 os déjà intégré en V1.13**, avec licence et provenance conservées ; garder le rig 18 os uniquement en secours/fantôme.
- Skinning multi-poids continu, géométrie anatomique, gants et chaussures détaillés, casque et masque de qualité.
- Blend d'animations préparatoires, IK 3D pieds/mains, angulation indépendante du bassin, retour élastique des skis.
- Retargeter des animations autorisées ; aucun fichier d'une autre marque de jeu.

## Priorité 3 — environnement

- Relief alpin crédible à plusieurs échelles, texture de neige PBR normale/roughness, roches et arbres de meilleure qualité.
- LOD et chunks de végétation, instancing, culling des infrastructures, budget de draw calls mesuré.
- Améliorer le ciel, nuages, brume et précipitations ; supprimer l'aspect géométrique encore visible.
- Finaliser l'aire de Coupe du monde : étendre les écrans chronométrés existants, foule animée, photographes, podium et zone mixte.
- Développer les ambiances ElevenLabs (public plus long, vent, carving, contacts différenciés) et leur mixage. Une boucle de public de 2 s est actuellement courte.

## Priorité 4 — contenu et carrière

- Valider GS/SG/DH avec leurs espacements, vitesses, règles, bosses et sauts propres.
- Plusieurs pistes et profils terrain, météo déterministe, catégories de records par conditions/matériel.
- Championnats, calendrier, entraînements ciblés, progression, déblocages et récompenses.
- Choix de casque, chaussures et bâtons au-delà du modèle unique actuel.
- Replay avec curseur, vitesse de lecture et caméra libre ; sauvegarde/export d'un replay.

## Priorité 5 — qualité et diffusion

- Tests réels WebGPU et GPU intégré/dédié ; mesures FPS/frametime à résolutions documentées.
- Vérification Firefox/Safari, manettes physiques, mobile et accessibilité des dialogues.
- Versionner les sauvegardes et prévoir leur migration avant de changer les schémas.
- API mondiale et validation/rejeu serveur uniquement lorsqu'un backend est effectivement déployé.

## Prochain lot visuel — après l'amélioration des effets neige

- Tester réellement les traces orientées dans les épingles, le spray aux différentes vitesses et le repli WebGL en navigateur.
- Ajouter des billboards orientés caméra ou de vraies particules instanciées si le GPU le permet ; vérifier coût de draw calls et GPU.
- Introduire un athlète plus anatomique, son skinning multi-poids et une IK tridimensionnelle. Les effets neige seuls n'améliorent pas la qualité du corps humain.
- Mesurer les performances sur machine utilisateur avant toute affirmation de 60 FPS.

## Validation de la fluidité adaptative

- Essayer en haute résolution sur un véritable PC : suivre les FPS, la qualité visuelle et les changements de résolution après 20–30 s de slalom.
- Tester le cas faible GPU : les images doivent rester lisibles et la physique ne doit pas ralentir artificiellement ; relever les FPS réels.
- Comparer 60 Hz et écrans à fréquence élevée. Aucun cap logiciel n'est imposé ; ajuster le seuil de qualité seulement avec des mesures réelles.

## Après essai joueur de la V1

- Recueillir les sensations de trajectoire, difficulté des portes SL, équilibre carving/dérapage et fluidité sur GPU réel.
- Refinement avec retours du joueur : intégration d'un modèle humain mieux skinné, IK en 3D, textures PBR plus abouties, performance du spray sur scènes complexes.
- Générer les quatre sons ElevenLabs additionnels lorsque le service est de nouveau disponible et importer les MP3 localement après vérification des droits.
- Déployer GitHub Pages dès que le propriétaire a configuré Source → GitHub Actions, vérifier URL et sécurité de l'audio.

## Priorités après mise à jour des surfaces

- Tester l'effet réel des zones de neige très dure sur la trajectoire du slalom, sans modifier la validation des 22 portes.
- Comparer visuellement neige PBR et rendu précédente sur machine avec GPU ; ajuster l'intensité de la coloration si elle devient trop visible.
- Optimiser le chargement des textures sur les navigateurs mobiles si cela rallonge le premier lancement.
- Réessayer les sons ElevenLabs dans une autre session seulement lorsque le service redevient disponible, puis importer les MP3 localement.

## Pistes après V1.2

- Mesurer et ajuster sur GPU joueur les billboards de neige et la végétation en réglages Élevé/Ultra.
- Revoir les sensations de flexion et de plantation du bâton à l'aide de retours vidéo de slalom réel et de tests en jeu.
- Faire évoluer le modèle GLB vers un skinning multi-poids, un anatomie plus détaillée et une vraie IK 3D.
- Ajouter des portes de slalom doubles, tracés combinés et modes course plus exigeants après stabilisation de la V1.
- Générer les nouveaux sons ElevenLabs lorsqu'ils deviennent disponibles, avec licences vérifiées, sans conserver d'appels payants au runtime.

## Après le nouvel avatar V1.3

- Tester sur GPU réel la nouvelle silhouette en caméra rapprochée et lors des rotations rapides de carving, puis affiner proportion et forme du dossard selon les retours.
- Améliorer à terme l'IK tridimensionnelle et des animations spécifiques pour petits sauts, collisions et départ de course.
- Mesurer les draw calls de l'avatar à 46 surfaces (plus un fantôme) sur machines modestes avant d'augmenter encore les polygones.
- Éviter toute promesse de photoréalisme sans scan/modèle source autorisé et mesure FPS sur le matériel joueur.

## Après V1.4 et le retour vidéo joueur

- Mesurer les FPS en course GS avec les 36 fanions, vérifier la lisibilité des piquets à 30/60/144 Hz.
- Évaluer la caméra de poursuite, les traces et le flux des portes sur la vidéo du joueur sans copier son contenu.
- Améliorer la chaîne de skinning et la posture du skieur en vrai carving (les géométries et IK demeurent semi-réalistes).
- Tester une variante d'animation plus ample pour les pivots après collision sans influer sur la validation des portes.
- Récupérer manuellement le nouveau MP3 ElevenLabs depuis le compte propriétaire, vérifier les droits d'usage, puis intégrer de façon locale et pérenne en `public/audio/carving.mp3`.

## Suite après V1.5

- Vérifier l'impact des sections supérieures supplémentaires sur le rendu GS et les FPS à qualité Ultra.
- Ajuster l'appui extérieur et le dosage de dérapage d'après des essais réels à la manette, pas seulement des tests de trajectoire.
- Refondre ensuite la géométrie humaine et l'IK 3D ; les nouvelles animations V1.5 ne rendent pas le GLB photoréaliste.
- Intégrer `carving.mp3` seulement si le fichier audio original ElevenLabs est récupéré durablement, puis tester droits, boucle et poids au chargement.

## Après V1.8

- Vérifier une course complète sans portes manquées avec un contrôleur de trajectoire sur le nouveau Super-G sinueux.
- Tester visuellement en qualités Élevé et Ultra sur GPU joueur et affiner courbes, textures de neige et forme du start gate selon le retour de la vidéo.
- Améliorer davantage la silhouette anatomique, le rig à 18 joints (poignets, épaules, hanches), et animer une course FIS à partir de clips droits/licenciés ou de mocap originale.
- Exporter un futur avatar en glTF/GLB + KTX2, LOD de décors et animation retargetée ; aucun besoin intrinsèque de changer de moteur.

## Suite après la sélection GLB CC0

- Examiner les logs du dernier workflow Actions pour confirmer les téléchargements et la publication des neuf GLB et des trois cartes PBR.
- Tester la hauteur des chalets, les normales des arbres, le rendu Snow 02 et l'absence de clignotement à toutes les qualités dans un vrai navigateur.
- Mesurer les performances PC/mobile et optimiser le nombre d'instances, puis ajouter un vrai LOD dynamique avec instancing par secteurs.
- Convertir les cartes JPG photo-PBR en KTX2/BasisU lorsque les décodeurs et tests WebGL2/WebGPU seront prêts.
- Refaire le coureur avec un rig de meilleure qualité et des animations compétitives autorisées, puis retargeter l'IK sans casser les modes de course.

## Suite de la boîte à outils de ressources 3D

- Tester le moteur de recherche APIs sur les plateformes de développement, puis créer des manifests d'import manuels pour d'autres assets CC0 réellement choisis (glace, roche granitique, bois, nuages).
- Préparer un rig de ski original dans Blender puis fusionner ses animations / IK avec les 18 articulations compatibles, une fois vérifiés les poids et les droits.
- Adapter le moteur PlayCanvas aux cartes KTX2 avec décodeur validé et fallback sur les JPG/GLB actuels.
- Étendre l'audit aux futures animations, modèles externes et sons avec provenance et licences par fichier.
- Vérifier l'échelle des UV, les niveaux LOD, le draw-call budget et les performances réelles sur GPU/iPhone avant promotion visuelle.

## Après V1.9 — finitions physiques et graphiques

- Faire vérifier visuellement la longueur réelle de réception des cinq sauts (la marge de placement de 80 m est volontairement conservatrice), puis ajuster le piquet suivant d'après la vitesse et le profil de saut, et non uniquement la distance z.
- Faire essayer le tissu original UV en qualité élevée, contrôler l'orientation et le rendu du dossard 61, et introduire des textures photo-PBR légales avec normales/micro-plis et compression KTX2 après test des décodeurs.
- Améliorer les proportions de la combinaison, les plis des genoux, la forme des épaules et une animation d'appui plus anthropométrique ; conserver les animations et les résultats.
- Mesurer la lisibilité et le bruit visuel du colorant bleu sur neige Poly Haven Snow 02 sur PC/iPhone, sans supposer que les captures SwiftShader sont des benchmarks.

## Après V1.10 — avancées à tester en vrai

- Comparer les matières PBR du skieur sur PC et iPhone, puis améliorer l'anatomie et les clips professionnels (IK 3D/retarget), sans annoncer mocap absente.
- Profiler les draw calls et les distances de culling GLB selon qualité ; ajouter des billboards ou vraies versions GLB low-poly si elles apportent une qualité mesurable.
- Expérimenter sélectivement les matériaux `slate_ridge`, `ice_compacted` et `chalet_wood` du Studio Kit après UV et droits vérifiés ; conserver Snow 02 photo-PBR comme référence.
- Calibrer l'effet neige de réception et la densité de particules sur GPU réel avant d'augmenter le budget mobile.
- Poursuivre tests de trajectoire des quatre disciplines, portillon de chrono, timing de la main, gate collisions et vidéo de comparaison propriétaire.


## V1.11 — départ du Super-G (branche PR #19)

1. ✅ Portillon unique à échelle FIS-inspirée, chrono SG déclenché au franchissement interpolé à 120 Hz.
2. ✅ Cabane structurée, fermée latéralement et derrière, habillage original à fibres de bois, toiture triangulée, protections, signalétique fictive et traces de skis.
3. ✅ Trois impulsions de bâtons SG associées à la force, aux poses articulées et aux impacts sonores, bâtons courbés; conservation des autres disciplines.
4. ⏳ Valider les captures Playwright d'une vraie exécution et surveiller les régressions caméra/ombres, puis fusionner après CI.
5. ✅ **Retarget de base de l'avatar 25 os intégré en V1.13** (versions mobile et détaillée). ⏳ Vérifier et affiner les neuf clips, les contacts neige-skis et les poses très basses ; mesurer la charge des meshes avant toute nouvelle version.
6. ⏳ Mesures de FPS et rendu PBR sur PC/iPhone réel, validation des angles/contact main-bâton sur vidéo plutôt qu'une promesse de mocap.

## Studio 3D (nouvel outillage, 17 novembre 2026)

- Installer et vérifier Blender + Blender MCP sur une machine compatible (configuration fournie, **non connectée dans le cloud**).
- Produire une version candidate originale Super-G dans un .blend distinct, avec continuité des articulations, textures PBR, skis, fixations et clips d'animation à valider.
- Passer `npm run studio:verify -- <candidat.glb> --rig --animations`, Khronos glTF Validator, tests PlayCanvas WebGL2/WebGPU et revue visuelle.
- N'intégrer le candidat au jeu qu'après mesures GPU PC + iPhone, vérification des droits, des 120 Hz de la physique et des tests de course.

## Après intégration Ammo.js — collision Super-G (PR #24)

- Vérifier **en navigateur réel** que le HUD montre AMMO.JS et que les 68 triggers Ammo détectent les contacts piquets (ils sont aujourd'hui des capteurs non autoritaires).
- Comparer les contacts enregistrés à la simulation déterministe `PoleSimulation` à fréquence d'affichage variable avant de modifier les réponses physiques de collision.
- Héberger localement `ammo.wasm.js`, `ammo.wasm.wasm` et `ammo.js` pour éviter la dépendance aux assets distants PlayCanvas, avec attribution/licence.
- Mesurer le chargement, la mémoire, la fluidité et la consommation sur mobile ; optimiser les triggers si nécessaire.
- Développer ensuite une vraie réponse physique du corps aux obstacles et un ragdoll, sans laisser Bullet écraser la dynamique de carving réglée à 120 Hz.

## Après étude des deux vidéos du 17 novembre 2026

- Vérifier en vues rapprochées le départ à -1,2 / -0,4 / +0,1 / +0,5 / +1,0 s : les contacts de bâtons doivent toucher la neige et rester fluides.
- Capturer des poses en gros plan pour edge -1, 0 et +1 avec f.load, pression et dérapage variables, en vérifiant les contacts et l'absence de traversée des articulations du monobloc.
- Mesurer l'occupation du cadre et retoucher la caméra de poursuite actuelle seulement si son rendu vérifié en navigateur reste trop éloigné, car les captures reçues peuvent représenter une autre build.
- Filmer l'arrivée et vérifier visuellement l'extension basse de la main plutôt que supposer le geste d'après la diffusion olympique distante.
- Produire/retargeter de véritables clips de Super-G aux droits vérifiés, une interpolation IK pelvis/cuisse/genou/cheville et des mains aux bâtons ; la calibration actuelle est artistique, pas une reconstitution 3D mesurée.

## Suite après correction intégrale du mouvement 25 os (17 novembre 2026)

- Inspecter les captures Playwright `sg-25bone-prestart-brace.png` et `sg-25bone-low-edge-contact.png` : confirmer que les skis attachés aux pieds touchent le relief, que les mains restent exactement sur les grips et qu'aucune collision visuelle ne survient.
- Tester le nouveau solveur de jambes sur GPU PC et iPhone avec commandes de direction fortes, bosses, envols, réception et finish ; relever les inter-pénétrations de tissu, ski et chaussures à chaque angle.
- Ajuster la bascule du bassin/torse et la hauteur des gants sur des vues de profil et 3/4 ; améliorer les pieds et l'IK latérale si la pente réelle dérive par rapport au modèle sagittal calculé.
- Faire une capture vidéo de 5 s au départ et 10 s dans les enchaînements rapides ; confronter aux plans reçus en séparant ce qui est visible de ce qui relève d'une supposition.
- À terme, créer de nouveaux clips de mouvement de Super-G multi-caméras sous licence/avec droits, puis retargeter les os et contrôler les transitions à 30/60/144 Hz avant de parler de rendu proche d'une véritable course FIS.

## Contrôles à effectuer sur la nouvelle posture carving 3D (17 novembre 2026)

- Comparer, en capture vidéo côté piste, la position en virage droit et gauche à la référence wireframe : bassin bas, hanche intérieure, flexion asymétrique, bras extérieur ouvert, skis parallèles sur la carre et spatules dans la trajectoire.
- Tester les variantes de GLB mobile et full ; corriger au besoin les axes de repos de cheville et les poids de skinning. Suivre les diagnostics `getAthletePose().competitionPose` pour atteindre une direction ski cohérente et une bonne erreur de cheville/poignée.
- Tester transitions de carres, deux appuis, piquets, départ, réception, arrivée, pause et anciens replays en WebGL2 sans modification de la physique à 120 Hz.

## Après la comparaison visuelle du 18 novembre
- Capturer de vrais plans côte à côte du jeu publié et de la référence (départ, carving à haute vitesse, arbres et roches, arrivée) ; calibrer caméra, pose, proportions et textures par observation, pas seulement par réglage de chiffres.
- Remplacer progressivement les volumes de roche et sapins trop géométriques par des modèles et matériaux PBR contrôlés, avec LOD/instancing. Ne pas copier les assets de la vidéo et ne pas supprimer les ressources CC0 existantes.
- Mesurer le rendu des ombres sur GPU mobile et GPU PC, vérifier les creux de neige, dépister artefacts de transparence / z-fighting et comparer coucher de soleil/jour.

## Suite de la mission du 18 novembre 2026

- Lire `REALISM_2026_11_18.md` et les preuves `references/2026-11-18` : les cinq vidéos prioritaires étaient absentes. Refaire une analyse image par image dès qu'elles sont accessibles ; ne pas reprendre une description historique comme preuve visuelle.
- Le rig actuel utilise les carres physiques, la pente/dévers, des cibles aériennes et une suspension amortie. Calibrer maintenant rayon/adhérence/angulation par rapport aux vidéos, particulièrement à haute vitesse et sur glace.
- Préserver les 42 portes reconstituées, les fanions souples, le seuil >45 %, les chronos par révision et les deux GLB du skieur. Les 43 portes FIS ne fournissent pas leurs coordonnées exactes.
- Cartographier le relief avec un DEM réellement disponible/licencié avant de promettre un Cortina exact. La géométrie actuelle reste schématique ; parois et matières doivent encore gagner en variété.
- Mesurer Low/Medium/High/Ultra sur GPU PC et mobile, puis décider des LOD/instancing. Les nouvelles branches sont batched, pas une preuve de gain de FPS.
- Réceptions, contact des semelles, genoux et skis doivent rester vérifiés via le véritable GLB et dans Chromium ; la validation par compilation seule est insuffisante.

## Vérification de publication du 19 novembre

- Contrôler les assets sur un serveur statique sans fallback HTML, puis sur GitHub Pages : Vite dev/preview peut masquer des fichiers manquants. Les sons doivent provenir de `PACKAGED_SOUNDS` et avoir un type MIME audio.
- Les quatre MP3 optionnels non générés restent remplacés par les synthèses existantes ; ne pas introduire de requêtes spéculatives vers des assets absents.


## Reconstruction du mouvement — jalon PR #56 (21 novembre 2026)

- [x] Remplacer le pilotage visuel des poses par une reconstruction procédurale liée à la charge, au changement de carre et aux phases de course.
- [x] Résoudre les bras après projection du bassin sur les deux points de contact des skis.
- [x] Préserver les deux ski-contacts, la physique déterministe et un repli vers les anciens contrôleurs.
- [x] Ajouter tests de phases et capture A/B au même point du parcours.
- [ ] Valider toutes les captures face/profil/poursuite, sur ordinateur et mobile, et rejeter les poses artificielles restantes.
- [ ] Importer légalement une véritable motion capture de ski à haute fréquence, retargeter le squelette 25 os et valider le skinning sous charge.
