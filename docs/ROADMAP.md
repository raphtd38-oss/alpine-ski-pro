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
