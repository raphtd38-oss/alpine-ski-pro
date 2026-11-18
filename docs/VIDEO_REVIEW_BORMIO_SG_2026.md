# Analyse vidéo olympique : Super-G masculin de Bormio — référence de mouvement

## Fichier et méthode

Vidéo fournie par le joueur : `Enregistrement 2026-11-17 201608(1).mp4`.
Durée **82,50 s**, H.264 1864 × 1020, 30 images/s ; extraction d'un storyboard sur la séquence entière, puis inspection d'images sélectionnées plus grandes. **Les secondes ci-dessous sont les horodatages du fichier**, pas le chrono officiel de course : le montage comprend le plateau d'introduction, des changements de caméras et la conclusion de la retransmission.

**DÉCOUVERTE IMPORTANTE :** la retransmission montre le SUPER-G **masculin sur la Stelvio à Bormio** (11 février 2026), identifiable par le cartouche « MEN'S SUPER-G » et le tracé filmé. FIS confirme **46 portes / 42 directionnelles**, tandis que le Super-G **féminin à Cortina, Olympia delle Tofane, 12 février 2026** compte **43 / 39**. Ne jamais transférer le placement des portes, les bosses ou la géométrie de cette vidéo à Cortina en prétendant reproduire la course olympique féminine.

Références officielles :
- Bormio, course 11/02/2026 : https://medias3.fis-ski.com/pdf/2026/AL/0199/2026AL0199.pdf
- Cortina, course 12/02/2026 : https://medias1.fis-ski.com/pdf/2026/AL/5183/2026AL5183SLR0.pdf
- Sites olympiques : https://milanocortina2026.coni.it/en/schedule/venues/impianto/81%3ATofane_Alpine_Skiing_Centre.html

Aucun photogrammètre, angle articulaire ni chronométrage précis n'est inféré de cette prise de vue. **La vidéo reste locale et n'est pas committée ni redistribuée sur GitHub.**

## Observations scène par scène

| Temps dans la vidéo | Observation directement visible | Déficit par rapport au jeu et correction |
|---|---|---|
| 00–08 s | Présentation de départ, portillon, piquets proches, départ en quelques impulsions | Éviter un départ figé et un skieur immobile : animation préparatoire + poussées déjà présentes, à comparer en grand plan |
| 10–16 s | Passage près d'une porte rouge, très forte prise de carre, corps bas et neige projetée, filets rouges en arrière-plan | Revoir le débattement du bassin, la flexion jambe intérieure, l'extension jambe extérieure ; le spray doit sortir du ski sous charge |
| 19–23 s | Enchaînement d'une grande courbe puis main très basse en sortie de virage, deux skis parallèles | Garder les épaules relativement face à la pente et non alignées rigidement avec les skis, éviter les plantés de bâton de slalom |
| 28–33 s | Indicateurs de vitesse `98` puis `105 km/h`, brève phase de vol clairement visible skis parallèles et groupés | Les vols doivent venir de la rupture de pente et de la vitesse ; cadrer le corps entier pendant les envols |
| 35–40 s | Ligne de course très lisible en vue large puis position de recherche de vitesse autour de `119 km/h` | Ajouter une posture aérodynamique visuelle en ligne droite rapide ; ouvrir la caméra latérale sans tremblement permanent |
| 43–52 s | Éloignement de la caméra, filets rouges et forêt, transition d'un tracé direct vers une longue courbe | Plusieurs prises de vues de télévision plutôt qu'un seul plan latéral constant |
| 53–63 s | Porte bleue très proche, changement d'appui et retour à une position basse mais mobile | Assurer orientation indépendante des deux skis, bassin et thorax avec contre-angulation et récupération rapide |
| 65–73 s | Derniers enchaînements, ligne bleue de neige, filets, éclairages, panneau de chronométrage | Soigner lignes bleues dans le relief, télécaméra, dernière compression et cadrage d'arrivée |
| 77–82 s | Tableau/plan final et retour sur athlète | Distinction nette entre fin de course et animation du podium/résultats |

## Corrections réellement codées (branche dédiée)

1. Nouveau module `src/render/superg-broadcast-shot.ts` : neuf secteurs de cadrage TV original avec coupes, alternance droite/gauche et mise à distance pendant les vols. **Les positions des caméras sont artistiques et ne représentent pas les installations officielles de Cortina ni Bormio.**
2. `src/render/engine.ts` : intègre ces cadrages pour le mode « Télévision » uniquement. Les modes Poursuite, Rapprochée et Subjective restent opérationnels, avec coupe au changement de secteur.
3. `src/render/superg-carve-kinematics.ts` : couche de tuck visuel en ligne droite très rapide, atténuée dans les grandes prises de carre, dans l'air et sur réception. Le bouton de tuck et la traînée aérodynamique en physique restent inchangés : **aucun avantage de vitesse gratuit**.
4. `src/render/cortina-sky-profile.ts` : retour au sunset **par défaut**, le mode jour restant accessible via `?lighting=daylight`.
5. Tests ajoutés sur les secteurs caméra, le cadrage du skieur et la baisse du tuck pendant les courbes et sauts.

## Ce qui reste objectivement loin de la vidéo

- La topographie de Cortina est encore schématique et n'a pas été reconstituée en DEM validé.
- Les portes du jeu ne suivent pas un relevé officiel ; ne pas remplacer par les 42 portes directionnelles de Bormio.
- Les hauteurs et durées de vol réel doivent être mesurées par vidéo dédiée à Cortina, pas extraites de cette retransmission de Bormio.
- Le coureur monobloc du jeu n'est pas une véritable animation mocap et le rendu PlayCanvas reste sensiblement moins détaillé que les images de la retransmission.
- Les captures navigateur SwiftShader ne prouvent pas les FPS sur une vraie carte graphique.

**Priorités de suite :** créer une vidéo de référence du Super-G féminin sur l'Olympia delle Tofane ; mesurer la trajectoire porte par porte si suffisamment d'images et des points de référence fiables existent ; reconstruire reliefs / sauts réels avant tout déplacement des portes ; améliorer GLB/skin et animations puis capturer les quatre caméras à vitesses comparables.
