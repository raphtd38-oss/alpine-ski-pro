# Historique

## 0.1.1 — 16 novembre 2026

- Charge extérieure et flexion influencent le rayon ; longueur des skis prise en compte dans la réponse et l'adhérence. La force latérale totale est bornée par le contact.
- Flexion de la géométrie des skis, conservée dans les nouveaux replays ; anciens replays compatibles.
- Neige avec normales procédurales et zones de granite sur les versants.
- Écran d'arrivée avec chronomètre réel, pente adoucie vers l'aire de décélération, tribunes alignées au terrain.
- Préférences persistantes, reprise robuste après sauvegarde corrompue, écart au record aux intermédiaires.
- Navigation mobile accessible, icônes et retrait de la vignette pendant la course.
- Repli WebGPU renforcé : détection d'adaptateur matériel et test d'allocation avant de lier le canvas. Récupération vers WebGL 2 après certaines erreurs de périphérique.
- Gestion des matériaux améliorée lors des changements d'équipement.
- Correction de l’affichage des centièmes au passage d’une minute.
- 19 tests unitaires ; nouveaux contrôles du rendu et du build de production.

## 0.1.0 — 15 novembre 2026

- Première boucle complète de slalom, athlète GLB riggé, simulation 120 Hz, piquets articulés.
- Quatre tracés, équipements, caméras, météo/qualité, interface, chronos, DQ, records, fantôme et replay.
- Profil et XP local, son ElevenLabs (musique, impacts, public) et synthèse neige/vent.
- GitHub Actions, documentation et PR #1. Tests Cloud et GitHub réussis ; Pages bloqué par l'activation propriétaire.
