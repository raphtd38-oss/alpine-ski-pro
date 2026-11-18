# Cortina 2026 — deux plans techniques : 42 portes jouables et zones de vol naturel

Date : 18 novembre 2026. **Document de conception, NON intégré à la course.** Aucun GPS officiel des portes, aucune vidéo image par image géoréférencée, aucun levé de pente en mètres locaux n'est fourni. Les stations ci-dessous sont **des propositions originales dans l'axe schématique z du jeu**, pas des placements officiels ou des positions FIS certifiées.

## Référence documentaire et contradiction à ne pas masquer

- Super-G féminin olympique du 12 février 2026 (codex FIS 5183) : départ 2 195 m ; arrivée 1 560 m ; dénivelé 635 m ; longueur effective de course 2 105 m ; **43 portes dont 39 directionnelles**, selon la fiche FIS de l'épreuve : https://www.fis-ski.com/DB/general/results.html?raceid=127538&sectorcode=AL
- Le plan olympique illustré du site dessine les secteurs Schuss, Duca d'Aosta Jump, Delta, Gran Curvone, Scarpadon et Rumerlo. Ce plan n'indique **pas** les coordonnées réelles de chaque porte. Le livre de résultats olympique comporte également un dessin de parcours préparatoire à 2 160 m ; **préférer la fiche de course effective à 2 105 m** : https://wmr-static-assets.scd.dgplatform.net/wmr/static/_PDF/OWG2026/ALP/Results_Book_ALP.pdf
- **Demande joueur : 42 portes jouables.** Elles ne pourront pas être décrites comme « les 42 portes exactes des JO 2026 », puisqu'il y en avait 43 officiellement. Viser 42 dans une version de test, puis effectuer une correspondance gate-by-gate avec vidéo autorisée et relever la 43e porte officielle avant d'affirmer la fidélité complète.
- Les repères Duca d'Aosta et Delta sont documentés par la description de la piste : https://www.impianticortina.it/en/olimpia-delle-tofane-one-of-the-best-ski-tracks-in-italy/ et témoignage https://www.corrierealpi.it/sport/sulla-pista-olympia-bisogna-attaccare-dallinizio-alla-fine-wnkbf1vf
- La branche main actuelle conserve **34 portes jouables** et **5 bosses définies** dans `src/game/superg.ts` : c'est voulu tant que la modification de la simulation n'a pas été vérifiée. Le projet ne possède pas encore de tracé topographiquement mesuré.

## Plan 1 — répartition de travail des 42 portes

### Principes
1. Conserver la longueur nominale 2 105 m et l'axe de piste provisoire ; ne pas mélanger station z et distance curviligne réelle.
2. Éviter l'alternance gauche/droite automatique à chaque porte. Laisser les grands rayons continus et prévoir 3 à 5 portes d'orientation/transition sans changement d'appui brutal. Les types exacts doivent être vérifiés avec les images de course.
3. Conserver la logique de 4 piquets et 2 fanions existante pour chaque porte jouable ; ne pas casser `src/game/poles.ts`, `race.ts`, les collisions, ni la règle de chute de banderole.
4. Ces 42 stations sont un **premier plan de simulation** : réviser z, x, angle, orientation, largeur et numérotation après comparaison avec la vidéo JO 2026 et données de référence légalement utilisables. Ni côtés, ni coordonnées x, ni couleur de fanion n'ont été observés pour les 42 portes.

### Six groupes de travail

| Portes | Secteur | Stations z (m de jeu) | But |
|---|---|---|---|
| 01–05 | Haut de piste / Schuss | 55–266 | Entrée progressivement rapide, gorge rocheuse, préparation de Duca |
| 06–12 | Duca d’Aosta / entrée Delta | 385–642 | Reprise après saut, traversée haute et préparation de la bosse Delta |
| 13–21 | Delta / Gran Curvone | 724–1058 | Sortie de compression et grand rayon tenu, plusieurs portes pouvant rester du même côté du virage |
| 22–28 | Scarpadon | 1138–1378 | Changement de pente puis ligne plus directe, enchainements moins alternés |
| 29–35 | Rumerlo / forêt | 1468–1708 | Glisse de reprise et tracé de forêt; relâchements à haute vitesse |
| 36–42 | Bas de piste / arrivée | 1748–2050 | Traversée finale, relief inférieur, saut final puis arrivée |

### Liste intégrale des 42 stations provisoires

| Porte | z (m de jeu) | Écart z précédent (m) | Secteur |
|---:|---:|---:|---|
| 01 | 55 | — | Haut de piste / Schuss |
| 02 | 107 | 52 | Haut de piste / Schuss |
| 03 | 161 | 54 | Haut de piste / Schuss |
| 04 | 214 | 53 | Haut de piste / Schuss |
| 05 | 266 | 52 | Haut de piste / Schuss |
| 06 | 385 | 119 | Duca d’Aosta / entrée Delta |
| 07 | 424 | 39 | Duca d’Aosta / entrée Delta |
| 08 | 462 | 38 | Duca d’Aosta / entrée Delta |
| 09 | 502 | 40 | Duca d’Aosta / entrée Delta |
| 10 | 542 | 40 | Duca d’Aosta / entrée Delta |
| 11 | 584 | 42 | Duca d’Aosta / entrée Delta |
| 12 | 642 | 58 | Duca d’Aosta / entrée Delta |
| 13 | 724 | 82 | Delta / Gran Curvone |
| 14 | 764 | 40 | Delta / Gran Curvone |
| 15 | 804 | 40 | Delta / Gran Curvone |
| 16 | 846 | 42 | Delta / Gran Curvone |
| 17 | 890 | 44 | Delta / Gran Curvone |
| 18 | 932 | 42 | Delta / Gran Curvone |
| 19 | 974 | 42 | Delta / Gran Curvone |
| 20 | 1016 | 42 | Delta / Gran Curvone |
| 21 | 1058 | 42 | Delta / Gran Curvone |
| 22 | 1138 | 80 | Scarpadon |
| 23 | 1178 | 40 | Scarpadon |
| 24 | 1218 | 40 | Scarpadon |
| 25 | 1258 | 40 | Scarpadon |
| 26 | 1298 | 40 | Scarpadon |
| 27 | 1338 | 40 | Scarpadon |
| 28 | 1378 | 40 | Scarpadon |
| 29 | 1468 | 90 | Rumerlo / forêt |
| 30 | 1508 | 40 | Rumerlo / forêt |
| 31 | 1548 | 40 | Rumerlo / forêt |
| 32 | 1588 | 40 | Rumerlo / forêt |
| 33 | 1628 | 40 | Rumerlo / forêt |
| 34 | 1668 | 40 | Rumerlo / forêt |
| 35 | 1708 | 40 | Rumerlo / forêt |
| 36 | 1748 | 40 | Bas de piste / arrivée |
| 37 | 1788 | 40 | Bas de piste / arrivée |
| 38 | 1828 | 40 | Bas de piste / arrivée |
| 39 | 1868 | 40 | Bas de piste / arrivée |
| 40 | 1923 | 55 | Bas de piste / arrivée |
| 41 | 1965 | 42 | Bas de piste / arrivée |
| 42 | 2050 | 85 | Bas de piste / arrivée |

Écarts : min **38 m**, max **119 m**, moyenne **48.7 m**. Les écarts sont sur z uniquement : la distance 3D et la longueur horizontale géodésique seront à vérifier. L'écart supérieur à 100 m autour de Duca est une **zone de saut et de réception** ; ce n'est pas une mesure du vrai tracé.

### Avant intégration dans `course.ts`

- Générer un ensemble de données explicites, non une simple extension de `superGGateZ(i)`.
- Remplacer uniquement après tests le `Array.from({ length: 34 })` par un compteur de portes calibrées ; préserver les identifiants cohérents pour l'UI, les replays et les collisions.
- Valider le franchissement en amont, le positionnement par rapport aux filets, les arrivées de saut, le chronométrage, et une descente complète en Chromium avant fusion.
- Séparer les anciens records et replays de la nouvelle géométrie de portes en versionnant la clé de course, sans effacer les données précédentes.
- **Pour une reconstitution IRL exacte**, il faut film complet avec gates visibles et points de calibration, images aériennes géoréférencées et/ou coordonnées d'implantation fournies par l'organisateur. Les données ne sont pas actuellement disponibles dans le projet.

## Plan 2 — zones de vol naturel et compressions

État actuel : `SUPER_G_ROLLERS` définit cinq bosses à z=316, 675, 1085, 1415, 1685 m et `superGRelief` une petite bosse finale à 1995 m. Dans `physics.ts`, le saut automatique dépend de la vitesse, de la **courbure verticale négative** et du contact avec la neige. Ajouter des reliefs ne garantit donc pas davantage de vol sans tests à vitesse réelle.

### Sites candidats

| ID | Secteur / secteur supposé | Station z (m de jeu) | Statut | Portes voisines | Exigence |
|---|---|---|---|---|---|
| A | Duca d’Aosta | 315–320 | saut principal documenté | 05→06 | crest arrondi, décollage naturel, réception avant la porte 06 |
| B | Delta | 670–678 | bosse naturelle documentée | 12→13 | allègement puis vol possible en fonction de la vitesse et de la trajectoire |
| C | sortie Gran Curvone | 900–916 | adaptation de gameplay, non attestée comme saut 2026 | 17→18 | simple allègement; aucune obligation de quitter le sol |
| D | Scarpadon | 1080–1095 | adaptation de relief, non attestée comme saut olympique | 21→22 | cassure avec potentiel décollage, grandes marges de réception |
| E | Pale / Rumerlo | 1408–1422 | adaptation de relief, non attestée comme saut olympique | 28→29 | mouvement de terrain long, compression suivie d'une rupture |
| F | forêt de Rumerlo | 1675–1695 | adaptation de gameplay | 34→35 | allègement léger uniquement : portes trop proches pour un saut forcé |
| G | avant finale | 1890–1905 | adaptation de gameplay, implantation à vérifier | 39→40 | saut court uniquement si retour au sol avant la porte 40 |
| H | dentino / saut final | 1988–2004 | bosse finale schématique ; position IRL non vérifiée | 41→42 | décollage potentiel suivi d'une réception avant la dernière porte et le chronomètre |

**La documentation prouve l'existence du Duca d'Aosta jump et de la bosse Delta dans la piste générale, pas la position des huit zones ci-dessus pour le Super-G olympique 2026.** C, D, E, F, G et H ne doivent pas être annoncées comme huit sauts réellement présents pendant l'épreuve sans vérification vidéo.

### Rendu physique souhaité

- Les décollements résultent d'un relief convexe cohérent et d'une vitesse suffisante (aucune impulsion automatique arcade systématique). Conserver l'intégration fixe à 120 Hz.
- Distinguer **allègement / ski légèrement délesté** et **vol franc**. Envisager au maximum 5–6 zones de vol possible et 2 allègements, pas huit vols garantis.
- Faire respecter les vitesses, la trajectoire latérale, la pression ski extérieur, l'angle d'appui et les transitions ; un virage fortement coupé peut supprimer le saut.
- Contrôler que l'atterrissage ne conduit pas dans une porte/fanion ou un filet à proximité ; ajuster d'abord la position de la bosse et les portes, pas le seuil de chute artificiellement.
- Pour chaque saut, enregistrer : `takeoffZ`, `speedMps`, `airtimeS`, `maxClearanceM`, `landingZ`, `landingShock`, `nearestGateDistanceM`. Ne pas revendiquer une durée ou une distance de saut sans ces mesures.
- Envol de compétition : skis qui restent parallèles ou s'écartent légèrement, flexion au décollage, absorption de réception, particules adaptées, aucun ski qui transperce le mesh.
- Prévoir des tests à vitesses 18, 25, 30, 35 m/s avec contrôles gauche, droite, tout droit, tuck ; comparer les résultats au terrain visualisé et aux séquences de référence.

### Conditions minimales de validation

- 42 portes dans le mode d'essai, z ordonnés et finis, passages validés, couloir dégagé.
- Aucun franchissement automatique ou collision invisible causé par les vols.
- Au moins deux décollages de test observés à vitesse adaptée sur des crêtes documentées ; les autres sont adaptés par secteur uniquement après validation.
- Altitudes départ/arrivée, 2 105 m et 635 m conservés. Surface visuelle et physique partagent `terrainHeight`.
- Comparaison de captures 2026 et simulation, tests unitaires, build, Playwright et tests GPU mobiles avant publication.
- Préserver le sunset par défaut et les assets actuels ; ce plan ne modifie aucune texture ni aucun luminaire.

## Fichiers concernés pour une future implémentation

- `src/game/superg.ts` : positions, profils de bosses, données de secteurs, seuils de saut.
- `src/game/course.ts` : gates explicites et `terrainHeight`.
- `src/game/physics.ts` : physique de vol et mesures de validation seulement si les tests démontrent un besoin réel.
- `src/game/race.ts`, `src/game/poles.ts` : contrôler les invariants sans réécrire ni contourner la simulation.
- `tests/cortina-course.test.ts`, `tests/superg.test.ts`, `tests/physics.test.ts`, tests navigateur.

**Livraison actuelle : conception et positions candidates uniquement.** Ne pas déclarer « 42 portes intégrées » ou « huit sauts jouables » avant modification et tests du moteur.
