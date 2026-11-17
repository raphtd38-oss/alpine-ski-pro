# Étude comparative des vidéos de Super-G — 17 novembre 2026

## Sources et périmètre

- **V1 / jeu :** `Enregistrement 2026-11-17 201101.mp4` ; environ 84,8 s, 1916 × 1030, 30 images/s. Enregistrement de la course d'**Alpine Ski Pro** filmée de l'arrière.
- **V2 / course réelle :** `Enregistrement 2026-11-17 201608.mp4` ; environ 82,5 s, 1864 × 1020, 30 images/s. Retransmission d'une course masculine de **Super-G des Jeux de Milano-Cortina 2026**, avec un athlète au dossard 10. L'image change souvent de caméra.
- Étude par échantillonnage temporel : pas de 6 s sur toute la durée, pas de 1 s sur les 20 premières secondes, puis fenêtres détaillées à environ 0,35–0,85 s. Les feuilles de comparaison et captures sont livrées dans le ZIP d'analyse, **pas dans le dépôt** pour éviter de publier des images de retransmission sportive.

**Limites incontournables :** le montage TV ne fournit pas des caméras synchronisées avec le jeu, pas de calibration des objectifs, pas de mouvement 3D humain mesuré, pas de force appliquée aux carres ni vitesse reconstituée indépendamment des incrustations. Tous les degrés et déplacements ajoutés au code sont donc des **paramètres artistiques** et non des mesures biomécaniques obtenues par tracking 3D. Les timecodes ci-dessous désignent le temps des fichiers MP4, **pas les chronos de course visibles à l'écran**.

## Analyse chronométrée de V2 — véritable Super-G

| Extrait MP4 | Observation directe | Enseignement animation |
|---|---|---|
| **0,0–4,4 s** | Plan rapproché de l'athlète dans la zone de départ ; deux poignées de bâtons tenues devant le corps, avant-bras écartés, regard vers l'aval. Le corps entier n'est pas visible. | Tenir visiblement les grips, bras pas simplement en T ; aucune mesure fiable des genoux ici. |
| **4,8–5,6 s** | Flexion du buste et de la tête vers l'avant, déplacement visuel des mains/poignées vers le bas ; concentration de la posture avant impulsion. | Animation anticipée, posture chargée avant le déclenchement. |
| **6,0–7,2 s** | Coupe sur un plan éloigné ; l'athlète quitte le départ, accélère, jambes et bras changent rapidement de position. | Transition *pousser → étendre les jambes → relâcher les bâtons*. La coupe empêche de compter rigoureusement chaque contact de pointe de bâton avec la neige. |
| **7,75–9,4 s** | Engagement du premier appui entre drapeaux, buste qui descend puis remonte légèrement, mains rapprochées et dirigées vers la trajectoire. | Éviter un départ rigide sans transition ; prise de carre progressive et regard vers l'aval. |
| **9,95–11,6 s** | Carving marqué, forte inclinaison des skis, jambe extérieure plus longue que l'intérieure, bassin engagé à l'intérieur ; buste compact, avant-bras près du corps. Puis sortie et réorientation. | Dissocier angulation du bassin et contre-rotation du buste ; transfert progressif des charges. |
| **12,15–13,8 s** | Regroupement aérodynamique à vitesse élevée : tête, coudes et poitrine proches, skis quasi parallèles, puis nouvelle direction. | Le repli entre portes ne doit pas être la même pose que l'appui maximal. |
| **30,5–37,7 s** | Succession de plans avec changements d'échelle ; direction et appuis alternés sur plusieurs portes. | Alterner *délestage court → nouvelle prise de carre → chargement → sortie* ; éviter un métronome de virages identiques. |
| **53,7–56,25 s** | Carve très bas, hanche proche du sol en projection, bras extérieur servant d'équilibre ; remontée marquée au changement de direction. | Accentuer les variations de hauteur du bassin, les écarts d'angles entre les deux jambes et la gestion des bras. |
| **57,1–63,9 s** | Appuis successifs très marqués, un ski extérieur fortement sollicité, fléchissement/extension de jambe à chaque courbe ; bâtons majoritairement trainants derrière ou repliés. | Ne pas planter agressivement un bâton à chaque virage de Super-G à grande vitesse. |
| **70,0–76,8 s** | Approche de l'arrivée et ligne vue à grande distance ; absence de gros plan de la main au passage. | **Impossible de vérifier un geste de main « gratter le chrono » sur ce clip.** Le garder comme choix artistique demandé par le propriétaire, non comme mouvement extrait de cette vidéo. |

## Analyse chronométrée de V1 — Alpine Ski Pro

| Extrait MP4 | Observation directe | Problème par rapport à V2 |
|---|---|---|
| **0,0–1,05 s** | Coureur vu de derrière, silhouette relativement verticale, bras latéraux assez ouverts ; la caméra traverse l'arche rapidement après GO. | Manque une préparation visuellement lisible : mains sur les grips, flexion progressive des épaules/du buste et vraie extension. |
| **1,4–3,5 s** | Le skieur reste petit à l'écran et progresse avec quelques gestes, mais aucun double appui de bâtons ne se distingue clairement. | Phases d'impulsion beaucoup moins visibles que sur le réel ; ne pas déduire qu'elles manquent de la physique sans inspecter le code. |
| **6–20 s** | Nombreux virages, personnage petit, très peu de changement de silhouette perceptible à cette échelle. | La caméra réduit la lisibilité du travail du rig et des contacts neige-skis. |
| **27–34,7 s** | Virages rapides à inclinaison visible, mais retour quasi vertical/fréquent, bras plus ouverts et buste moins compact. | Variations trop pauvres : bassin moins bas, moins de différence entre jambes et de tenue du ski extérieur. |
| **48–68 s** | Silhouette arrière similaire et angles moins lisibles que sur le montage réel ; la caméra demeure à grande distance. | Ajuster l'animation et le cadrage, pas uniquement les textures. |
| **74–80 s** | Passage sous l'arche de chronométrage vu de dos ; l'extension basse d'une main n'est pas identifiable à l'échelle du personnage. | Conserver le geste déjà codé mais produire des plans rapprochés et tests de visibilité spécifiques. |

## Diagnostic du code observé dans main à la date de l'analyse

Le dépôt **V1.13** contient déjà les éléments suivants, susceptibles d'être postérieurs aux captures enregistrées : un avatar monobloc de 25 os, une tige de départ à impulsion, trois poussées à l'aide des bâtons, un solveur de jambes et un geste de finish bas. Le décalage entre les vidéos et ce code ne doit pas être confondu avec l'absence de ces systèmes.

### Ajustements effectués dans cette livraison

- `src/render/superg-video-pose.ts` : enveloppe pure de carving par engagement des carres. Elle accentue les **hanches basses**, leur déplacement à l'intérieur, la **jambe extérieure plus longue**, la **jambe intérieure plus fléchie**, le maintien de la tête vers l'aval et réduit l'effet en dérapage ou en l'air.
- `src/main.ts` : transmet au rendu le **temps restant du compte à rebours**, sans le confondre avec un chrono de course. La préparation peut ainsi se charger progressivement AVANT le GO.
- `src/render/athlete.ts` : applique ces enveloppes sur les os actuels ; inclut une flexion préalable et plante les bâtons au sol pendant la fin du compte à rebours. Aucun changement de la physique, de l'Ammo.js, des portes ou de la mesure du chrono.
- `tests/superg-video-pose.test.ts` : pose neutre, appui fort, symétrie de courbe, réduction en l'air/dérapage, montée progressive de préparation au départ.

### Priorités restantes

1. Mesurer le skieur à l'écran (hauteur en pixels/occupation du cadre) dans le navigateur actuel ; éviter de réparer la caméra à partir d'une version filmée potentiellement plus ancienne.
2. Comparer sur GPU réel les poses à `edge = ±1`, sur compression et dérapage, et vérifier que le bras/les bâtons ne traversent pas les jambes.
3. Pour égaler le mouvement réel au-delà des corrections de réglage, produire des clips de Super-G licites capturés en plusieurs vues, puis retargeter proprement les 25 os (biomécanique dynamique / IK mains pieds).
4. Filmer et vérifier un gros plan du départ sur 0–2 s et du finish ; les deux vidéos fournies ne donnent pas de précision suffisante pour une mesure 3D exacte.
5. Tester les transitions à 30/60/144 Hz et les replays, sans modifier l'état déterministe de la course.

**Droits d'image :** analyser les captures transmises par le joueur est distinct d'importer un clip olympique ou une texture de la retransmission dans un jeu distribué. Aucun asset visuel extrait du film réel n'est ajouté au dépôt.
