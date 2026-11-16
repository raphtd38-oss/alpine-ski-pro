# Ressources, provenance et droits

Aucun code, texture, son ni modèle de CarveMania n'est utilisé.

## Créations originales dans le dépôt

- `public/assets/skier.glb` : généré par `scripts/build_skier.py` pour ce projet, 18 articulations, 20 surfaces PBR, 219 172 octets. Aucun modèle téléchargé. Le script constitue la source éditable ; qualité stylisée initiale, pas un scan humain.
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
