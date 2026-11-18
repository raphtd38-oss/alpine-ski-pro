# Audit et comparaison — 18 novembre 2026

Base auditée : `28653d9` (main). PlayCanvas 2.24.1, TypeScript 5.9.3 déclaré, Vite 8.3.8, solveur 120 Hz. Personnage monobloc 25 os conservé.

## Références disponibles

Recherche dans /workspace, /tmp, les répertoires partagés et le dépôt cloné : aucune vidéo utilisateur accessible. Les anciens rapports du dépôt sont des documents historiques, pas des vidéos visionnées dans cette session.

Fichiers manquants :
- Enregistrement 2026-11-17 201101.mp4
- Enregistrement 2026-11-17 201608.mp4
- Enregistrement 2026-11-18 134005.mp4
- Enregistrement 2026-11-18 141438.mp4
- ScreenRecording_11-18-2026 1-40-40 PM_1.mp4

Les autres vidéos et captures utilisateur ne sont pas jointes. La recherche dans tout l’historique Git retrouve cinq anciennes captures du jeu (menu, mobile, production, race, finish-arena), retirées par `21e3510` ; la capture race a été examinée et montre l’ancien SL à 22 portes. Ce ne sont pas les vidéos demandées ni une référence d’athlète. Aucun fichier vidéo n’a été retrouvé dans l’historique. Pas d'extraction, d'estimation d'angles ou de durée à partir de vidéos inexistantes. Les captures de cette session proviennent du jeu local, avec fixtures explicitement synthétiques. Elles ne constituent pas une validation par rapport à un athlète réel.

## Défauts identifiés dans le code de départ

- `setFoot` vise `snowY` même quand le root est à `ground + height` : jambes étirées et skis aspirés vers le sol en vol.
- Orientation des skis en Euler à partir de la pente Z uniquement : dévers et direction de déplacement ignorés.
- Compensation de semelle utilisant 0,125 m vertical au lieu de l'offset tourné du pivot : contact incorrect à forte carre.
- Animation réinvente angle de carre, direction des skis et appui à partir de l'input, même sans force latérale. Pose très engagée possible au pas.
- Le rig tourne de 180° : son os nommé LeftFoot est à droite dans le repère transversal de la simulation. Les noms anatomiques ne correspondent pas aux côtés physiques utilisés pour la neige et la charge.
- Pression calculée avec courbure Z, même en traversée ; pression et force d'appui restent positives en vol.
- Aucun état de suspension amortie ; réception utilisée seulement comme impulsion visuelle.
- Les tests existants autorisent jusqu'à 70 cm d'erreur de contact et ne contrôlent pas les pieds en vol.

## Régression de référence

Avant modification : 163 tests unitaires / 37 fichiers réussis ; test Chromium du rig 25 os réussi (1 test, 26,2 s, SwiftShader). Les captures d'origine sont conservées ici. Le succès de ces anciens tests ne garantit pas l'absence des défauts ci-dessus.

## Périmètre

Priorité physique/contact/biomécanique, puis tracé demandé à 42 portes et ambiance sunset. Reconstitution artistique conservée ; les coordonnées officielles des portes ne sont pas disponibles dans les fichiers. Aucun changement du seuil de chute strictement >45 %, du personnage ou du mécanisme élastique des piquets.

## Preuves finales de cette étape

- `before/` et `after/` : cinq fixtures identiques (neutre, gauche, droite, vitesse de marche, vol) et leurs mesures. Les captures HUD sont figées : les valeurs HUD ne décrivent pas la vitesse imposée à la fixture. Lire les JSON.
- `in-game/force-contact-flight.png`, `force-contact-landing.png` et `force-contact-trajectory.json` : saut, réception et changements de carres produits par les entrées du simulateur.
- `in-game/sky-before.png` / `in-game/force-contact-flight.png` : même instant simulé, avant/après correction de la coupure du ciel à 2 400 m.
- `in-game/superg-finish-reach.png`, `superg-FULL-25-bones.png`, `ultimate-cortina-loaded-carve.png` : captures de la suite navigateur, avant la dernière correction du ciel.
- `profile-before-culling.json` / `profile.json` : même scène Low, 1 100 × 720, Chromium SwiftShader ; 35 intervalles d’images, cinq lots de 12 000 pas physiques. Ce sont des mesures du cloud logiciel, pas un benchmark PC/mobile. La scène est figée et sans particules actives : leur coût séparé n’est pas mesuré.
- `profile-concurrent-workload.json` : essai conservé pour transparence mais exclu des comparaisons de vitesse car effectué pendant une autre charge CPU.

Les fixtures `after/` précèdent également la correction du ciel ; la pose et le contact n’ont pas changé ensuite. Les références ne contiennent aucune image d’un athlète réel.

`production-local.json/png` : vrai bundle compilé, sans API de test DEV, lancé à la racine du serveur Vite preview ; chrono et commande clavier réels.
