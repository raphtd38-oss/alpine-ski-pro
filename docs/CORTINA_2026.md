# Cortina d'Ampezzo — Olympia delle Tofane (Super-G 2026)

**Course active depuis V1.14.** L'ancien tracé fictif « Glacier Express » (1 980 m, ~546 m de dénivelé) a été remplacé par la reconstitution **jouable** du pack original fourni : `Alpine_Ski_Pro_Cortina_SuperG_2026_3D_PACK (1).zip`.

## Données factuelles, vérifiées par la FIS

- Épreuve de référence : Super-G féminin olympique, **12 février 2026**.
- Piste : **Olympia delle Tofane**, Cortina d'Ampezzo (Italie).
- Altitude de départ : **2 195 m** ; arrivée : **1 560 m**.
- Dénivelé : **635 m** ; longueur officielle : **2 105 m**.
- Course officielle : **43 portes**, dont **39 portes directionnelles**.
- Document FIS de référence : https://medias1.fis-ski.com/pdf/2026/AL/5183/2026AL5183SLR0.pdf

## Réalisation dans Alpine Ski Pro

- **Une seule discipline active** : Super-G. Pas de retour du SL, GS ou DH.
- Nouvelle courbe de piste à **24 points de passage schématiques**, via `src/game/superg.ts`, jusqu'à z=2105.
- Altimétrie interpolée à **19 points**, cohérente entre physique et rendu, avec début proche de y=0 et fin y=-635 (en mètres de jeu).
- Secteurs : **Schuss**, **Duca d'Aosta**, **Delta**, **Gran Curvone**, **Scarpadon**, **Pale di Rumerlo**, diagonale finale et **dentino**.
- **5 crests/sauts**, compressions et grandes courbes basés sur les formes originales du ZIP, pas sur des coordonnées de piquets mesurées.
- Décor original de falaises dolomitiques, éboulis, épicéas, refuges et télésiège, rendu par `src/render/cortina-scenery.ts`, avec variation de quantité par qualité graphique.
- La nappe de neige de `src/render/world.ts` **suit maintenant l'axe sinueux** et couvre 440 mètres de large en maillage, au lieu d'être fixée autour de x=0.
- Conservation du skieur monobloc 25 os V1.13, des skis, des départs chronométrés, de la physique personnalisée à 120 Hz, des caméras, de l'audio et des textures PBR.
- **Conservation des 34 portes jouables existantes**, avec adaptation des abscisses à l'axe et exclusion des zones de saut. Leurs piquets, fanions, collisions et lignes bleues ne sont **pas réinventés**. Ces portes ne doivent pas être confondues avec les 43 portes réelles.
- Les enregistrements/records du nouvel itinéraire sont séparés de ceux de Glacier Express : nouvelle clé de sauvegarde `alpine-ski-pro:cortina-2026:v1`. Le nom, l'XP et les courses complétées sont migrés depuis l'ancienne sauvegarde, mais **pas** ses replays ni ses temps incompatibles. L'ancienne sauvegarde demeure stockée.

## Ressources du pack non embarquées dans le jeu

Le ZIP fournit trois GLB techniques de terrain `Cortina_2026_SG_Terrain_LOD0.glb` (~7,41 Mo), `LOD1.glb` (~1,52 Mo), `LOD2.glb` (~0,28 Mo), principalement conçus pour l'édition hors ligne et l'inspection 3D. **Ils ne sont pas chargés dans le navigateur** : le rendu de neige reste déterminé par la même fonction de hauteur que les collisions. Les charger par-dessus créerait une double surface et augmenterait le temps de chargement sans bénéfice démontré. Les aperçus PNG et le CSV de points de la ZIP sont des références de création, non des dépendances runtime.

## Limites d'exactitude

**Ceci n'est pas un jumeau numérique exact de la piste officielle.** Les points de virage et les reliefs du pack sont des approximations originales inspirées de schémas. Il n'y a pas de MNT/DEM officiel, ni de GPS des 43 portes, ni de scan laser. L'axe z du simulateur est une station nominale et non la mesure de l'arc de courbe sur le terrain.

Les obstacles et dessins 3D de ce pack sont originaux, et aucune image ou ressource commerciale de Cortina ou CarveMania n'est copiée. Les noms de lieux et dimensions sont utilisés à titre descriptif, sans affiliation officielle.

## Vérifications de publication

- `npm ci`, `npm test`, `npm run build`, `npm run test:e2e` dans GitHub Actions.
- Tests spécifiques : départ/arrivée, 24 points, 635 m de dénivelé, 34 portes conservées, préservation de l'ancienne sauvegarde, nouveau titre et distance dans Chromium.
- Validation des appuis sur skis et des temps au travers de la course, ligne de fin à z=2105.
- Les mesures de performance **GPU réel** sur iPhone et PC demeurent à effectuer.

## Ambiance sunset et éclairage de course (extension)

- `src/render/cortina-atmosphere.ts` ajoute un ciel de crépuscule entièrement procédural (dégradé rose/orangé/violet), **15 pylônes** originaux avec têtes LED émissives et protection orange.
- Le moteur utilise un soleil directionnel bas et chaud, une ambiance plus froide sur la neige, et du brouillard de distance rose. Les intensités de soleil restent adaptées à la météo sélectionnée.
- Les luminaires proches (2 en moyen, 3 en haut, 4 en ultra, aucun en faible) créent de vrais éclairages non ombrés sur la neige ; les autres panneaux lumineux restent visibles sans lumière dynamique, afin de préserver le rendu mobile.
- Les **34 portes jouables** existantes sont recentrées sur une trajectoire de Super-G à virages alternés et sorties de courbes. Leurs systèmes de piquets souples, de collision, de fanions et de marquage bleu sont préservés.
- Les positions de projecteurs et des portes sont des choix de création **non mesurés par les organisateurs**. L'illustration demandée est une référence artistique, pas une carte exacte du site ni une preuve de rendu identique en jeu.
- Aucune photo source, texture de marque, modèle ou audio tiers supplémentaire n'est incorporé au dépôt.

## Décor visuel cinématique complémentaire

Le module `src/render/cortina-cinematic-detail.ts` ajoute de grandes aiguilles rocheuses à strates, des sommets à névés, un peuplement forestier de grands sapins, des rainures de damage, des filets A rouges plus denses, des postes TV et un hameau alpin lointain. Tous ces objets sont **visuels** et ne changent pas les hauteurs physiques du parcours, les collisions, le chronométrage ou les 34 portes déjà présentes.

`src/render/cortina-light-accents.ts` ajoute des halos de projecteurs et des nappes de lumière sur la neige collées au relief. Les nuages du ciel de `cortina-atmosphere.ts` sont colorés par sommet, sans texture externe. Des plafonds de détail `low / medium / high / ultra` limitent la géométrie sur téléphone ; la quantité de lumière dynamique reste celle déjà limitée par la V1.14.

La photographie / illustration fournie sert uniquement de **référence de direction artistique** : le décor est original, non géoréférencé et n'est pas la topographie officielle réelle de Cortina. Les emplacements des maisons, appareils de télévision, arbres et luminaires sont reconstitués, et leurs tailles/couleurs sont des choix de conception. Les résultats GPU réels sur iPhone, Android et PC nécessitent des essais sur appareils.


## Extension visuelle de référence photographique — 18 novembre 2026

Les six photographies transmises par le propriétaire ont servi de références **de forme, matériaux, neige et structure d'un parcours**, non de données GNSS, MNT, orthophotos exploitables, ni de texture reproduite. L'une des vues d'arrivée et la carte des disciplines peuvent documenter des configurations antérieures : ne pas les assimiler automatiquement au schéma des équipements olympiques 2026.

Le nouveau module `src/render/cortina-reference-landmarks.ts` dessine dans la scène PlayCanvas existante huit placements **schématiques** de parois irrégulières stratifiées (Schuss, Duca d'Aosta, Delta, Gran Curvone, Scarpadon, Rumerlo et approche arrivée), leurs corniches de neige, une couche de conifères de premier plan (épicéas à branches distinctes et mélèzes dégarnis), ainsi que des éboulis. `World` conserve son terrain, les 34 portes jouables, les contacts ski/neige, les filets existants et le chronomètre. Les maillages sont regroupés par matériau ; les densités low/medium/high/ultra sont plafonnées. Aucune image d'auteur ni marque n'est distribuée.

**Précision :** ces profils sont artistiques, **pas** une reconstruction géographique exacte. Pour créer un véritable jumeau numérique, acquérir un DEM admissible pour la zone et la licence d'utilisation, géoréférencer les orthophotos exploitables, ajuster des levés de contrôle et valider chaque portion de piste avant de toucher aux collisions. Les 43 portes officielles (39 directionnelles) ne sont pas extrapolées depuis les photos. La V1.15 reste la base fonctionnelle ; aucun objectif de qualité AAA ou de FPS sur GPU réel n'est certifié par cet ajout.

**Attention licences (novembre 2026) :** les accès au service Copernicus DEM GLO-30 sont soumis aux catégories éligibles depuis juillet 2026, contrairement à l'hypothèse d'un téléchargement universel gratuit. Voir https://dataspace.copernicus.eu/news/2026-7-17-copernicus-dem-30m-view-service-license-acceptance et la licence associée. Aucun DEM tiers n'est livré dans cette extension.


## Éclairage photographique de jour (18 novembre 2026)

Les photos du propriétaire montrent un ciel bleu de compétition et des falaises aux couleurs beige/gris/ocre. Le ciel de crépuscule rose déjà présent en V1.15 ne permettait pas une comparaison raisonnable avec ces références ; un profil **diurne** procédural devient le mode par défaut, avec lumière solaire moins chaude, ambient et brume raccordés au même bleu. L'ancien sunset demeure accessible via `?lighting=sunset` et les projecteurs restent fonctionnels. Les couleurs sont artistiques, pas un éphéméride astronomique certifié. Le rendu doit être mesuré sur GPU réels iPhone et PC et comparé visuellement aux références ; aucune photographie n'est embarquée dans les assets.
