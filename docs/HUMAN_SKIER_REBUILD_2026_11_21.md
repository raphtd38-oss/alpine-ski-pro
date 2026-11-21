# 21 novembre 2026 — Refonte de la posture humaine (lab PR #53)

**Observation source :** dans `latest_whole_AB.png` et le gros plan, le skieur existant a le dos plié, les bras pendants et les genoux anormalement groupés. Les A/B MotionSmith PR #52 sont presque identiques, donc ce n'est pas un défaut de vitesse d'interpolation uniquement.

## Bug d'architecture constaté
La précédente pose `SuperGCompetitionPose` additionne une inclinaison globale d'environ 45–60°, une baisse du bassin jusqu'à 0,70 m, une flexion de la colonne de 40–60° et plusieurs rotations d'épaules/coudes indépendantes. Le solveur de jambes tente ensuite d'atteindre les chaussures déjà fixées à la neige : mathématiquement une posture possible, visuellement le corps est disloqué. Les anciens tests imposaient même `pelvisHeightM < 0.76` en virage engagé.

## Nouveau prototype complet de posture
La fonction `humanRacerPose` remplace cet empilement par une seule construction liée à la phase de course, charge, vitesse, relâchement et appui :
- bassin plus haut, déplacement latéral borné ;
- inclinaison du corps réduite, torse/cou/tête synchronisés et poignets placés en position de bâtons ;
- extension de la jambe extérieure obtenue par le placement du bassin **avant** le solveur des deux jambes ;
- le reste du système s'occupe seulement de fermer les deux jambes sur les chaussures réelles ;
- la physique 120 Hz, le chronomètre, les portes et les 42 portes actuelles ne sont pas modifiés.

Le mode est accessible sur une build expérimentale avec `?pose=human-v3`. Le jeu normal reste inchangé tant que les captures à l'identique (poursuite et gros plan) ne sont pas validées.

## Critères d'acceptation
1. Contacts ski-neige réels, écart de cheville rendu inférieur à 10 mm, direction de ski exacte.
2. La tête réellement rendue doit rester au-dessus du bassin ; flexion des genoux bornée à 115° sur les deux grandes courbes.
3. Les positions du centre de masse, des poignets, de la colonne et des jambes doivent rester crédibles sur les captures de face/profil/dos.
4. Même vitesse/trajectoire avant/après ; aucun changement de physique/replay ou des collisions.
5. Rejeter si la silhouette reste cartoonesque ou si les tests ne passent pas.

Ce travail n'est pas une mocap professionnelle et ne prétend pas l'être.
