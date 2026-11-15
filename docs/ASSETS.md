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
