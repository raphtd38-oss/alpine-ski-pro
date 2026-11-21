# Contrôle réel des animations du skieur — 21 novembre 2026

## Conclusion vérifiée

**Les neuf animations intégrées au GLB ne sont pas de véritables séquences de ski enregistrées.** Le test `tests/glb-motion-audit.test.ts` ouvre **les octets binaires du GLB mobile** sur GitHub Actions, lit les échantillons des accessors glTF et mesure les mouvements des os. Ce n'est ni une analyse visuelle approximative ni un simple comptage de noms de clips.

Résultat du run [44934648198](https://github.com/raphtd38-oss/alpine-ski-pro/actions/runs/44934648198) : **chaque clip dure 0,95 seconde et chaque canal possède trois images clés**. Cela fait des poses animées courtes plutôt qu'une capture continue d'un skieur réel. La version mobile ne contient donc pas assez de données de mouvement pour produire un Super-G humain réaliste par simple interpolation.

| Clip GLB mobile | Durée | Canaux animés | Images clés par canal | Amplitude maximale observée |
|---|---:|---:|---:|---:|
| SG_START_PUSH | 0,95 s | 6 | 3 | ~26° (bras) |
| SG_AERO_TUCK | 0,95 s | 14 | 3 | ~24° (bassin) |
| SG_CARVE_LEFT | 0,95 s | 10 | 3 | ~24° (bassin) |
| SG_CARVE_RIGHT | 0,95 s | 10 | 3 | ~24° (bassin) |
| SG_COMPRESSION | 0,95 s | 6 | 3 | ~27° (jambe) |
| SG_AIR | 0,95 s | 8 | 3 | ~25° (jambe) |
| SG_LANDING | 0,95 s | 6 | 3 | ~24° (jambe) |
| SG_FINISH | 0,95 s | 6 | 3 | ~48° (bras) |
| SG_GATE_IMPACT | 0,95 s | 5 | 3 | ~38° (bras) |

Amplitudes = écart angulaire maximal entre la première orientation et les autres orientations enregistrées, sans garantir qu'une posture est anatomiquement correcte. Le test ne certifie pas la qualité du skinning et ne remplace pas une inspection du modèle complet ou de la version full du GLB.

## Expériences de cette session

- PR #48 fusionnée : annulation de la régression sur les jambes provoquée par #47, sens des commandes conservé. Tests réussis, déploiement réussi.
- [PR #49 expérimentale](https://github.com/raphtd38-oss/alpine-ski-pro/pull/49) : visualisation des clips originaux et captures. Ne pas l'intégrer comme « animation réaliste » : les clips sont trop pauvres en images clés, les skis ne sont pas recalés sur les contacts en mode démo.
- [PR #50](https://github.com/raphtd38-oss/alpine-ski-pro/pull/50) : essai d'extension/retard de tuck. **Rejeté et fermé** après comparaison A/B du même point de piste : les deux silhouettes à 23 km/h sont quasi identiques, test Playwright volontairement rouge. Preuve : [Actions 44934468378](https://github.com/raphtd38-oss/alpine-ski-pro/actions/runs/44934468378).

## Ressources externes vérifiées et droits

- Étude académique peer-reviewed (2026) sur phases neutral / edging start / load start / turn maximum / edging finish et déplacement du centre de masse chez des coureurs de GS : https://doi.org/10.3390/app16147041
- Étude sur la cinématique jambe intérieure/extérieure dans 253 descentes dont 29 SG : https://doi.org/10.3389/fspor.2020.00056
- Cosindra MotionSmith Slalom skiing : https://cosindra.ai/motionsmith/motions/slalom-skiing — 6 s / 180 images à 30 fps, base UE5 Manny, une prise téléchargeable gratuitement pour usage commercial selon l'éditeur. **Téléchargement bloqué derrière la création/connexion à un compte gratuit** (https://cosindra.ai/auth?mode=signup). Aucun fichier sous droit tiers n'a été ajouté à ce dépôt.
- Rokoko Vision : https://www.rokoko.com/products/vision — outil de vidéo vers mocap, requiert compte, traitement et retargeting. Pas utilisé dans cette session.
- Carnegie Mellon mocap : https://mocap.cs.cmu.edu/ — base libre d'utilisation, mais les clips trouvés ne sont pas un équivalent direct d'une descente de Super-G.

## Pipeline nécessaire avant de remplacer le coureur

1. Acquérir légitimement un **véritable clip de ski** (FBX/BVH/GLB avec plusieurs dizaines/centaines d'images clés, licence jeu commercial). Ne pas pirater ni inclure un clip TV sans autorisation de redistribution.
2. Importer dans Blender/Rokoko et **retargeter** UE5 Manny ou mocap vers les 25 os de notre GLB, conserver les angles articulaires et la posture de course. Remplacer le mesh/poids de skinning si le rendu demeure stylisé.
3. Ajouter dans le jeu un système de **motion matching / phases de virage** : amorce, extension, appui sur la jambe extérieure, flexion intérieure, sortie de carre, réception, aérien.
4. Recaler les skis/chaussures sur la surface par IK **après** les keyframes mocap, sans modifier les données physiques de course à 120 Hz.
5. Capturer un comparatif **avant/après** au même angle et mêmes conditions sur desktop et mobile, rejeter tout effet grenouille, pénétration de neige ou mouvement désarticulé.
6. Fusionner et publier seulement lorsque les tests unitaires ET la revue visuelle sont convaincants.

**Aucune version n'est déclarée « comme dans la vraie vie » dans ce rapport.** Le jeu public reste stable.
