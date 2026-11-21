# 21 novembre 2026 — Reconstruction équipement et avant-départ (prototype visuel)

Cette branche conserve le rig 25 os et les deux skis entièrement pilotés par la simulation. Elle reconstruit autour de la silhouette un kit original dont les composants suivent directement les os Head/Chest, sans modifier les 42 portes ni les sauvegardes.

## Livré en code

- Casque de vitesse anatomique à coque profilée, oreillettes, rétention, lentille ski convexe et masque réfléchissant : src/render/racer-premium-gear.ts.
- Deux panneaux de dossard incurvés et texturés, numérotés 27 par défaut, valeur paramétrable via ?bib=1..999, graphismes originaux pour éviter de copier logos et sponsors protégés.
- Partie inférieure du visage visible et bouche/jaw modulés par respiration, effort, impact, inclinaison ; masque de course couvre les yeux (comme en ski réel).
- Échauffement piloté par la phase du compte à rebours : respiration, mobilisation des épaules, secousses de bras, flexions de genoux, mise en appui, position de départ. Les deux skis restent verrouillés au sol ; préstart-warmup.ts est purement visuel.
- Gros plan de pré-départ puis retour automatique à la caméra poursuite, uniquement en SG.
- Tests unitaires pour la chronologie, tests navigateur avec trois captures, matériel présent, synchro skis/bâtons.

## Limites à ne pas masquer

Ceci n'est PAS la création d'un nouveau GLB maillé, ni de la capture de mouvements FIS réelle. Il s'agit d'une reconstruction du kit du personnage et de sa séquence d'avant-course dans PlayCanvas. Le dossard et le casque sont des créations graphiques fictives ; aucun casque virtuel ne peut être « homologué » physiquement. Aucun autocollant FIS officiel n'est créé.

En 2026/27, le casque SG physique doit notamment satisfaire les normes EN 1077 classe A et ASTM 2040 ainsi que le test complémentaire à 6,8 m/s, et porter le marquage du fabricant. Source officielle : https://assets.fis-ski.com/f/252177/x/509846f40d/specifications_for_alpine_competition_equipment_19-11-2026.pdf (page 33).

## Véritables assets à intégrer ultérieurement après téléchargement/retargeting

- Animation de ski MotionSmith : https://cosindra.ai/motionsmith/motions/slalom-skiing ; free take téléchargeable avec compte gratuit, GLB ou BVH ; le squelette UE5 Manny nécessite retargeting vers les 25 os du jeu.
- Motion capture d'échauffement : https://kinemiq.app/animations/idle-warm-up/ ; export GLB/FBX/BVH, licence CC-BY 3.0 exigeant attribution, à vérifier sur l'asset exporté. 
- Pour l'animation du visage de qualité production, prévoir un personnage avec morph targets faciaux, texture de peau PBR et keyframes originales. L'avatar actuel n'a pas de blendshapes faciaux validés.

La branche ne doit pas être fusionnée sans inspection des nouvelles captures et vérification des licences des futurs imports.
