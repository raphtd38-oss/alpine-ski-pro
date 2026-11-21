# Reconstruction biomécanique du Super-G — 21 novembre 2026 (PR #56)

## Pourquoi réécrire le contrôleur

Les 9 clips GLB précédents durent chacun 0,95 s et ne comportent que 3 clés par canal (voir HUMAN_MOTION_AUDIT_2026-11-21.md). Ils ne sont pas du motion capture continu. Accélérer l'interpolation ne peut pas les transformer en mouvement de course humain.

Le mesh 25 os est conservé à la demande du propriétaire : silhouette, chaussures et skis peuvent rester exactement les mêmes. Cette reconstruction concerne le **moteur d'articulation du corps**, pas un nouveau modèle 3D ni une prétendue acquisition mocap.

## Ce qui a réellement changé

- src/render/superg-human-reconstruction.ts : nouveau contrôleur avec filtre temporel en secondes et phase de changement de carre, extension, mise sous pression, position aérodynamique, poussées de départ, saut, réception et arrivée, utilisant les forces déjà calculées dans la simulation.
- src/render/superg-race-pose-director.ts : le directeur 25 os appelle le nouveau moteur en mode normal, maintient deux pieds/ski sur les axes physiques, résout le bassin et les jambes par IK, **puis seulement** les deux bras. Cela supprime le déplacement des poignets dû à une correction tardive du bassin.
- Objectifs de main plus vivants : prise d'appui extérieure asymétrique, mains rassemblées en schuss, alternance de départ, compensation des sauts et main droite vers le bas à l'arrivée. Les bâtons restent placés à partir des vrais poignets 3D.
- La physique 120 Hz, le contrôle, les pistes, les 42 portes, les collisions, les sauvegardes et les replays restent intacts.
- Le paramètre ?pose=human-v3 restaure le système précédent, ?pose=legacy restaure l'ancien contrôleur historique.

## QA vérifiable

- tests/superg-human-reconstruction.test.ts vérifie la conservation des skis, appuis des deux côtés, départ, saut et remise à zéro.
- tests/human-racer-rig.test.ts vérifie la géométrie des vrais os, appuis et mesures de tête/genoux/poignets.
- tests/browser/reconstructed-motion.spec.ts produit deux paires d'images A/B identiques du même skieur, même course : mode précédent et reconstruction.
- La revue VISUELLE de ces captures et les tests Chromium sont un préalable à la mise en production. Aucun test n'est une preuve de réalisme photoréaliste ou de vraie mocap.

## Limites

L'animation reste procédurale, avec des constantes de design et non des données directes de laboratoire. Le rendu ne peut pas égaler une capture de Super-G professionnel à haute densité sans obtenir légalement les clips, retargeter le rig, synchroniser la trajectoire et vérifier les déformations du skinning. Ne pas annoncer de motion capture Cosindra ou Rokoko intégrée : aucun fichier compatible sous licence n'a été téléchargé dans cette branche.
