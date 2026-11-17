
## V1.15 — micro-relief calcaire et éclairage d'origine procédurale

- Un normal map tangent-space procédural est désormais fabriqué via Canvas selon la qualité (128/256/384 pixels) dans src/render/cortina-cinematic-detail.ts ; aucune photographie ni nouveau modèle GLB ajouté et aucune licence tierce consommée.
- Les 15 vrais spots utilisent PlayCanvas 2.24.1, pas de nouveau service d'éclairage ni shader importé. La texture procédurale est ajoutée aux ressources de World pour éviter toute fuite GPU lors de reconstruction.
- Les modèles et textures Snow 02, CC0 Poly Haven, ainsi que les GLB du skieur monobloc, demeurent exactement ceux du jeu, sans copie d'assets CarveMania.

## Extension originale Cortina cinematic (17 novembre 2026)

- `src/render/cortina-cinematic-detail.ts` : roches dolomitiques stratifiées, pics enneigés, forêts (épicéa/mélèze), piste damée, filets A rouges, postes caméra, hameau et fenêtres. Matériaux et géométries **entièrement procéduraux**, sans GLB/PBR externe.
- `src/render/cortina-light-accents.ts` : halo des LED et taches de lumière chaude au sol ; une texture RGBA de gradient radial 192×192 est dessinée par Canvas localement à chaque création de course, jamais téléchargée.
- `src/render/cortina-atmosphere.ts` : nuances de cirrus roses calculées dans les couleurs du dôme de coucher de soleil. Aucun ajout de modèle 3D, photo, audio ou marque protégée par des tiers.
- L'image conceptuelle de sunset est une **référence visuelle seulement**, elle n'est pas chargée ni redistribuée dans le jeu ; le terrain n'est pas un jumeau numérique de Cortina.

## Extension Cortina sunset / LED (17 novembre 2026)

- `src/render/cortina-atmosphere.ts` crée un ciel synthétique, des mâts de projecteur et panneaux lumineux procéduraux. **Aucun fichier photo ou vidéo, PBR commercial, GLB externe, audio ou logo n'est téléchargé.**
- Le comportement lumineux est écrit avec les composants natifs de PlayCanvas 2.24.1. Pas de droits supplémentaires nécessaires pour les formes procédurales originales.
- La géographie représentée n'est pas photogrammétrique ; les éclairages sont une reconstitution artistique motivée par la référence du propriétaire, pas un plan officiel de l'éclairage de Cortina.

## V1.14 — reconstruction Cortina 2026 issue du ZIP du propriétaire

- Source fournie : `Alpine_Ski_Pro_Cortina_SuperG_2026_3D_PACK (1).zip`, originaux procéduraux décrits dans `cortina_sg_pack/docs/README_FR.md` ; les courbes/cotes/points de stations sont des approximations déclarées dans ce pack, pas des coordonnées officielles des piquets.
- Modules intégrés : `src/game/superg.ts` (24 points de tracé, référence d'altitude 2 195→1 560 m, cinq crêtes), `src/game/course.ts` (profil physique/visuel à 635 m), `src/render/cortina-scenery.ts` (falaises/éboulis/épicéas/refuges/télésiège procéduraux à faible nombre de draw calls) et recentrage du terrain dans `src/render/world.ts`. Nouvelles dimensions de course nominales : 2 105 m.
- **Pas de copie** de photos, panoramas officiels, topographie sous licence, ressources de CarveMania ou marques de sponsors. Le modèle original et les scripts sont fournis pour le projet par son propriétaire.
- `Cortina_2026_SG_Terrain_LOD{0,1,2}.glb` : modèles de travail du ZIP **non intégrés au runtime** (respectivement environ 7,41 Mo, 1,52 Mo, 0,28 Mo). Ils représentent la même géométrie mais ne servent ni de surface de collision ni d'affichage embarqué. Ils restent disponibles dans l'archive fournie au développeur pour Blender.
- Les 43 portes officielles 2026 sont une référence factuelle FIS ; **34 portes simulées** sont conservées. Le parcours représenté n'est pas homologué ni GPS exact.
- Source FIS : https://medias1.fis-ski.com/pdf/2026/AL/5183/2026AL5183SLR0.pdf ; détails et limites dans `docs/CORTINA_2026.md`.

## V1.13 — coureur monobloc original fourni par le propriétaire (17 novembre 2026)

- `public/assets/racer/seamless-full.glb` : **17 259 488 octets**, SHA-256 `bd35beb515859628056e9ef7c024f626e2b7580f09fb1d46a4439fb34a9a48a9` ; correspond au `ASP_SUPERG_RACER_SEAMLESS_FULL_212.glb` du ZIP utilisateur `Alpine_SuperG_Coureur_Monobloc_Anime_2026(2).zip`.
- `public/assets/racer/seamless-mobile.glb` : **5 539 148 octets**, SHA-256 `f61e1a87ac61c954f8afd9e182d4ecc9ff3138af9b36a4c6eb73cc273794bad1` ; correspond au `ASP_SUPERG_RACER_SEAMLESS_MOBILE_512.glb` du même ZIP.
- Les deux fichiers sont authentifiés en tests. Corps unique fermé, 25 os / poids normalisés, neuf animations glTF **originales mais procédurales**, protections, casque, skis de Super-G 212 cm et fixations attachés aux os des pieds. Documentation d'origine : `07_PLAYCANVAS/README_INTEGRATION.md` et `12_CREDITS_LICENSES/LICENCE_ORIGINAUX.md` dans le ZIP envoyé. Le texte du pack autorise utilisation, modification et distribution des créations originales selon les principes CC0, sans accorder de droits sur des marques tierces.
- Import binaire effectué et hashes vérifiés via GitHub Actions ; le workflow temporaire de transfert externe a été supprimé avant fusion. Les binaires sont **dans le dépôt**, aucun CDN n'est utilisé au runtime.
- Skieur historique 18 os conservé pour fallback et fantôme. L'augmentation du nombre de pièces de chaussures/fixations (115 meshes sur le GLB mobile) est réelle et nécessite des mesures GPU mobile ; la variante dite mobile réduit surtout textures et maillage du corps, et ne constitue pas une optimisation avancée de draw calls.
- Ne pas annoncer un scan photoréaliste ou une motion capture : le GLB demeure stylisé et les animations nécessitent de futures corrections biomécaniques.

## V1.12 — nettoyage Super-G (17 novembre 2026)

- Fichiers supprimés de l'arbre courant : cinq anciennes captures `docs/screenshots/*.png` (2 437 344 octets) et ancien prototype `scripts/build_skier.py` (6 141 octets). Ces fichiers restent récupérables dans l'historique Git ; ils n'étaient pas embarqués dans le site publié.
- Les modèles CC0 Alpine Snow Village et les textures photo-PBR Poly Haven **utilisés en jeu** sont conservés. Conserver la chaîne `scripts/build_skier_pro.mjs` et le GLB actuel ; suppression d'un modèle réellement chargé interdite sans remplaçant testé.
- Disparition des autres disciplines des sources actives : cela réduit le code et les choix d'interface, pas massivement le poids des textures/GLB chargés.

# Ressources, provenance et droits

Aucun code, texture, son ni modèle de CarveMania n'est utilisé.

## Créations originales dans le dépôt

- `public/assets/skier.glb` : nouveau coureur original V1.3, 18 articulations compatibles, 46 surfaces PBR, 13 matériaux et environ 600 ko. La source de génération canonique est maintenant `scripts/build_skier_pro.mjs` (Node, aucun Blender). Le script `scripts/build_skier.py` a été supprimé en V1.12. La génération vérifiée en CI fournit des pondérations multi-os qui réduisent la rigidité des articulations, sans prétendre à un scan photoréaliste.
- Géométries de pistes, montagnes, forêt, piquets, infrastructure, skis et textures Canvas : code original dans `src/render/`.
- Glisse, vent et tonalités de départ/arrivée : synthèse Web Audio originale dans `src/game/audio.ts`.
- L'habillage de l'arrivée est original. Aucune licence de marque FIS ou Audi n'est revendiquée et aucun partenariat n'est annoncé.

## ElevenLabs — fichiers générés sur le compte connecté

Générés à la demande du propriétaire le 15 novembre 2026, téléchargés puis hébergés localement. Ces fichiers **ne sont pas des ressources CC0** ; leur utilisation relève des conditions ElevenLabs et des droits du compte qui les a générés. Aucun droit commercial universel n'est affirmé ici. Attribution : [ElevenLabs](https://elevenlabs.io).

| Fichier                  | Modèle                  | Génération           | Durée source / traitement                                                                              |
| ------------------------ | ----------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `public/audio/pole.mp3`  | eleven_text_to_sound_v2 | 7fCFNwUXVSFLrUjM9VjZ | Source 2 s ; premier impact isolé sur 0,35 s avec fondu. Original conservé dans `docs/audio-sources/`. |
| `public/audio/menu.mp3`  | eleven_music_v2         | BS1SCqWH4bHkSeGVr62c | 30 s, composition demandée instrumentale originale, aucune référence d'artiste.                        |
| `public/audio/crowd.mp3` | eleven_text_to_sound_v2 | PvciPuHYRKY0EYk0POLh | Le service a retourné 2 s malgré une description de 10 s ; boucle courte, à améliorer.                 |

La musique est activée après interaction et atténuée pendant les courses. Le public augmente à l'approche de l'arrivée. Le bruit du piquet est déclenché par une collision, avec gain selon vitesse et panoramique. Les créations ne sont pas des enregistrements d'une véritable Coupe du monde.

Conditions à conserver pour toute exploitation commerciale ultérieure : https://elevenlabs.io/terms-of-use et conditions spécifiques de la musique/du forfait. Les crédits consommés par les trois générations ont été confirmés par le service : 50 + 900 + 50 crédits. Aucun appel payant n'a lieu pendant le jeu.

## Logiciels et polices

- PlayCanvas 2.24.1 : MIT, notice copiée de la dépendance dans `docs/licenses/PlayCanvas-MIT.txt`.
- Barlow / Barlow Condensed : SIL Open Font License 1.1, distribuées via `@fontsource`, notices dans `docs/licenses/`. Polices locales, aucune requête Google Fonts au lancement.
- Vite / Vitest / TypeScript / Playwright / Prettier : licences respectives dans les paquets verrouillés par `package-lock.json` ; outils de développement sauf le code applicatif compilé.
- WebGPU utilise les shaders WGSL natifs de PlayCanvas 2.24. Aucun binaire glslang/twgsl tiers n'est redistribué.

## Pack audio immersif — tentative du 16 novembre 2026

Un flow ElevenLabs a été créé pour quatre effets originaux : carving sur neige dure (7 s), ski sur glace (7 s), vent à grande vitesse (12 s) et public d'arrivée (25 s). Son lien est https://elevenlabs.io/app/flows/3a7o6vXZTCRaMICykpbt . **Les nouveaux effets audio n'ont PAS été générés** : le service a renvoyé « Free generations are busy right now » avant démarrage ; **aucun crédit n'a été débité**. Les quatre nœuds existent, mais leurs sorties audio sont indisponibles. Ne pas prétendre qu'ils sont dans le dépôt.

Pour intégrer ultérieurement des générations correctement autorisées et téléchargées, placer leurs fichiers, avec leur provenance et leur licence vérifiée, dans :
- `public/audio/carving.mp3` (carres en appui sur neige dure) ;
- `public/audio/ice.mp3` (dérapage/crissement sur neige verglacée) ;
- `public/audio/wind.mp3` (vent à vitesse élevée) ;
- `public/audio/crowd-long.mp3` (ambiance extérieure plus longue remplaçant l'actuel public de 2 s).

Le code charge ces fichiers seulement s'ils existent ; sinon, les trois premiers effets sont synthétisés localement par Web Audio et la boucle actuelle de `crowd.mp3` reste en service. **Aucun de ces quatre fichiers optionnels n'est présent actuellement.** Vérifier les conditions et droits ElevenLabs à chaque génération avant redistribution commerciale.

## Nouveau matériau neige de la mise à jour V1

- `src/render/snow-texture.ts` génère localement et de façon déterministe les cartes albedo, micro-normales et rugosité de la neige. La palette est originale et ne contient aucun fichier de CarveMania.
- `src/game/surface.ts` définit un relief de dureté/adhérence doucement variable sur la piste, utilisé également pour la teinte visuelle des zones compactées.
- Aucun contenu externe ni licence supplémentaire nécessaire pour cette mise à jour.
- Nouvelle tentative ElevenLabs le 16 novembre 2026 : création refusée avant démarrage (service occupé), zéro fichier MP3 livré et aucun crédit débité.

## Nouveaux détails originaux V1.2

- `src/game/guide.ts` et `src/render/world.ts` : trajectoire indicative d'entraînement interpolée et dessinée par notre code, sans ressources externes.
- `src/render/athlete.ts` : insertions originales de petit équipement 3D (masque, casque, boucles de chaussures), riggées sur le squelette existant.
- `src/render/effects.ts` : particules de neige rendues par billboards et retombée sur le sol, sans textures téléchargées.
- Aucune nouvelle génération ElevenLabs livrée pour ce lot. Les fichiers audio existants et leur provenance restent inchangés.

## V1.3 — coureur de slalom professionnel original

- Modèle entièrement regénéré : combinaison ajustée avec panneaux noirs, dossard blanc incurvé sur la poitrine, épaules plus sportives, gants, casque aérodynamique et masque cuivré, protections de genoux/tibias et coque de chaussures de compétition.
- 18 os conservés sous leurs noms d'origine pour éviter de casser les animations, mais nouveaux sommets pondérés entre plusieurs os près des hanches, épaules, genoux et coudes.
- Le fichier binaire `public/assets/skier.glb` est versionné et générable à l'identique par `npm run assets` à partir de `scripts/build_skier_pro.mjs`.
- `npm run assets:verify` vérifie automatiquement la validité du conteneur GLB, les noms des os, les indices, les poids des sommets, la géométrie et le budget navigateur.
- Les nouvelles formes sont des créations procédurales originales, sans assets tiers ou fichiers de CarveMania. La qualité est plus riche mais reste stylisée, non photogrammétrique.

## V1.4 — textures originales et provenance de l'inspiration vidéo

Le joueur a fourni une vidéo de 55 s d'une course *Giant Slalom Switchback B* avec deux piquets de porte rouges/bleus et panneaux colorés, des bois de sapins, neige damée, montagnes et filets. Notre version V1.4 n'importe **ni les pixels, ni le code, ni la bande-son** de ce jeu.

- `src/render/gate-textures.ts` : texture Canvas générée lors du chargement du niveau pour les piquets fibre de verre et fanions originaux marqués ALPINE SKI PRO.
- `src/game/gates-visual.ts` : flutter simple simulé à partir du temps et de la vitesse du ressort, purement visuel.
- `src/game/pole-sound.ts` et `src/game/audio.ts` : bruitages originaux de piquet et tissu créés à partir de Web Audio, combinés au MP3 ElevenLabs existant du piquet.
- ElevenLabs (nouvel essai du 16 novembre 2026) : **un** son original de carving 7 secondes a été généré (`twV2FljboNunWB9zOUVI`, `eleven_text_to_sound_v2`, 70 crédits). Il est accessible dans https://elevenlabs.io/app/flows/3a7o6vXZTCRaMICykpbt mais **non intégré dans le dépôt** faute d'accès aux octets du MP3. Ne jamais stocker l'URL signée temporaire comme dépendance durable.

## Pack 3D CC0 — intégration alpine du 16 novembre 2026

- **Modèles et manifeste** : [Alpine Snow Village — 3DAssets.dev](https://3dassets.dev/packs/alpine-snow-village) ; [manifeste complet](https://3dassets.dev/api/v1/packs/alpine-snow-village). Licence [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). Géométries originales réalisées avec assistance IA selon le fournisseur, pas des scans photoréalistes.
- **Neuf GLB branchés sur le rendu** : chalet (19780), maison d'hôtes (19785), grand sapin (19789), pin (19786), jeune sapin (19788), rocher enneigé (19791), affleurement rocheux (19793), roche glaciaire (19792), panneau de montagne (19808). Provenance et tailles dans scripts/alpine-pack.json ; les originaux sont sur cdn.3dassets.dev/assets/{id}/v1/model.glb.
- **Neige photo-PBR** : [Snow 02](https://polyhaven.com/a/snow_02), Rob Tuytel, sous CC0. Trois cartes JPG 1K (couleur, normale OpenGL, rugosité) sont utilisées avec répétition et anisotropie ; repli automatique sur les cartes Canvas générées si une carte manque.
- **Intégration** : le workflow GitHub Actions exécute npm run assets:alpine avant compilation et livre les GLB/JPG dans son artefact déployé. Le script vérifie la taille et le conteneur glTF, avertit si un téléchargement échoue ; le jeu conserve ses modèles procéduraux en repli. Les fichiers téléchargés ne sont pas versionnés dans Git lui-même.
- **LOD spatial** : les GLB détaillés bordent la piste ; arbres lointains et montagnes restent dans des maillages groupés, avec budgets par qualité. Ombres des modèles importés limitées aux bâtiments pour ne pas alourdir les courses.
- **Limites** : les modèles ajoutés sont statiques avec matériaux colorés (pas de nouvelles animations ou de scans). Le skieur GLB original et son IK sont préservés. Les textures Snow 02 sont en **JPG 1K, non KTX2** ; le LOD dynamique et l'optimisation Basis/KTX2 restent à faire. Aucun asset de CarveMania n'est utilisé.

## Outils de découverte et de production — 16 novembre 2026

Les scripts de la nouvelle boîte à outils **n'ajoutent pas automatiquement de binaires sous licence tierce au jeu** : ce sont des aides destinées aux agents de code, décrites dans [RESOURCE_CATALOG.md](RESOURCE_CATALOG.md) et [ASSET_WORKFLOW.md](ASSET_WORKFLOW.md).

- Recherche API en lecture seule Poly Haven et ambientCG, sans compte ; conserver crédit Poly Haven et User-Agent pour la live API.
- Audit GLB/provenance/budget depuis scripts/asset_audit.mjs, blocage en CI des nouveaux fichiers visuels non déclarés et vérification du pack existant.
- Blender exportateur local et glTF Transform optionnel pour inspection/optimisation WebP, sans remplacement aveugle du coureur actif.
- Le KTX2, les nouveaux rigs et les animations de ski externes ne sont **pas activés** par ce lot ; aucune modification des licences ElevenLabs existantes.
- La documentation précise la divergence entre la licence générale récente de Quaternius (QAL) et certaines pages de packs toujours marquées CC0 ; contrôle asset par asset obligatoire.

## V1.9 — habillage original du coureur et marquage de neige

- **Textures d'athlète entièrement originales** : `scripts/racer-textures.mjs`, génération déterministe en Node de quatre PNG RGBA 256×256 (trame de combinaison, motif carbone, dossard de course original n°61 et surface réfléchissante du masque). Aucune image récupérée d'un jeu, marque ou site externe, aucun modèle ou police tiers.
- **UV et distribution** : `scripts/build_skier_pro.mjs` crée `TEXCOORD_0` sur chaque surface du GLB et les coutures de raccord, puis incorpore les quatre images au format glTF 2.0 `image.bufferView` dans `public/assets/skier.glb`. Les 18 articulations et animations existantes sont conservées ; le contrôle `scripts/check_skier.mjs` vérifie UV, PNG, poids de skinning et structure.
- **Colorant de neige FIS-inspiré** : texture Canvas originale, pulvérisation irrégulière avec alpha, couloirs bleus le long des deux courbes de piste, guides de portes et marquages transversaux avant sauts ; création locale sans fichier externe.
- **Licences** : ces textures sont des créations du projet ; pas de reproduction d'une vidéo, pas d'utilisation des graphismes propriétaires de CarveMania, ni d'affiliation officielle FIS. Les neuf GLB CC0 et la neige CC0 de Poly Haven restent en place.
- **Limite technique** : l'albédo UV et les facteurs de rugosité/métal PBR sont présents ; ce lot n'est pas de la mocap, une normal map textile haute résolution, ou un avatar photoréaliste.

- **Skis de course** : `src/render/athlete.ts` génère une texture originale de topsheet marine, motifs carbone, accents turquoise et lettrage ALPINE SKI PRO (canvas local, UV propres). Aucune marque de fabricant copiée.


## V1.11 — assets conservés ou remplacés
- Cabane de départ SG : anciennes primitives assemblées supprimées **du générateur de scène**, remplacées par une maquette originale texturée dans `src/render/world.ts`. Texture originale de fibres/planches créée par Canvas sur le navigateur; toit triangulé neige PBR utilisant les cartes déjà chargées; signalétique et pistes originales. Aucune nouvelle image téléchargée.
- Bâtons SG : tube continu courbe défini par un maillage paramétrique dans `src/render/athlete.ts`; aucun modèle commercial copié. Sons de plantation et clic mécanique : synthèse Web Audio originale dans `src/game/audio.ts`, aucune licence ajoutée.
- Archive `Alpine_SuperG_Racer_Pro_Kit_2026.zip` autorisée par le propriétaire, examinée; rig candidat 25 os, 146 meshes sur versions full/mobile, neuf animations procédurales. **Ni ses GLB ni ses 64 textures ne sont diffusés dans cette mise à jour** : le skieur existant à 18 os reste activé par compatibilité et performances. Voir `docs/V111_START.md`.

## 17 novembre 2026 — animation des poses de carving

- Référence visuelle : capture wireframe fournie par le propriétaire ; **aucune image externe, motion capture, texture ou modèle supplémentaire intégré au runtime**.
- Nouveaux modules TypeScript du modèle mathématique et de l'IK 3D dérivés des sources originales transmises par le propriétaire `superg-carve-kinematics.ts` et `superg-race-pose-director.ts`. Les deux modèles de skieur GLB conservent leur provenance V1.13 ; aucune ressource CarveMania utilisée.
