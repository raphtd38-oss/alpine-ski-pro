# Ressources, provenance et droits

Aucun code, texture, son ni modèle de CarveMania n'est utilisé.

## Créations originales dans le dépôt

- `public/assets/skier.glb` : nouveau coureur original V1.3, 18 articulations compatibles, 46 surfaces PBR, 13 matériaux et environ 600 ko. La source de génération canonique est maintenant `scripts/build_skier_pro.mjs` (Node, aucun Blender). Le script `scripts/build_skier.py` reste seulement comme ancien prototype. La génération vérifiée en CI fournit des pondérations multi-os qui réduisent la rigidité des articulations, sans prétendre à un scan photoréaliste.
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
