# Feuille de route persistante

Le but est un simulateur de ski de grande qualité, amélioré sur le même dépôt à chaque session. Aucun travail autonome entre sessions n'est promis.

## Priorité 1 — sensations et règles

- Faire essayer le SL au joueur et recueillir ses sensations sur le rayon, la vitesse, les transitions et le freinage.
- Définir un mode accessible et un mode course exigeant ; conserver les tests de parcours valides.
- Raffiner contacts séparés des skis et charges intérieures/extérieures, flexion dynamique plus détaillée (déformation visuelle déjà présente), conservation d'énergie et décollage sur relief.
- Calibrer les piquets sur des valeurs documentées ; distinguer contacts skis / tibias / mains / corps, plier le fût en plus de l'articulation.
- Vérifier la règle de passage des deux skis et pieds sur plusieurs trajectoires, portes verticales, doubles et figures ; ne pas annoncer conformité FIS sans validation.
- Ajouter collisions avec obstacles, réaction corporelle et ragdoll avec un moteur physique navigateur approprié, sans casser le solveur de carving.

## Priorité 2 — athlète

- Remplacer/améliorer le GLB original par un vrai athlète de production, avec licence et provenance conservées.
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

## Suite après la sélection GLB CC0

- Examiner les logs du dernier workflow Actions pour confirmer les téléchargements et la publication des neuf GLB et des trois cartes PBR.
- Tester la hauteur des chalets, les normales des arbres, le rendu Snow 02 et l'absence de clignotement à toutes les qualités dans un vrai navigateur.
- Mesurer les performances PC/mobile et optimiser le nombre d'instances, puis ajouter un vrai LOD dynamique avec instancing par secteurs.
- Convertir les cartes JPG photo-PBR en KTX2/BasisU lorsque les décodeurs et tests WebGL2/WebGPU seront prêts.
- Refaire le coureur avec un rig de meilleure qualité et des animations compétitives autorisées, puis retargeter l'IK sans casser les modes de course.
