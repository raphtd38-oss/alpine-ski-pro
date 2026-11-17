## 1.10.0 — 17 novembre 2026 — Studio Kit 3D / PBR / LOD

- Analyse de l'archive utilisateur Studio Kit 2026 (11 GLB, 42 cartes PBR, scripts et rapports). Réutilisation **sélective** ; aucun remplacement aveugle de modèles au rendu inférieur ou du terrain physique.
- Distance de visibilité des modèles CC0 de décor, par qualité graphique, avec hystérésis et fond alpin groupé toujours présent.
- Athlète GLB à 18 joints maintenant équipé de cartes OpenGL de micro-normales de tissage/carbone, roughness/metallic et ambient occlusion embarquées avec ses textures UV, selon les principes du générateur PBR du kit.
- Gerbes de neige à la réception des sauts, séparées des gerbes du carving et bornées selon la qualité (y compris léger retour visuel en qualité basse).
- Nouveaux tests unitaires pour LOD et neige, contrôles du générateur GLB PBR plus stricts. Rapport d'intégration et empreintes dans `docs/STUDIO_KIT_2026.md`.
- Pas de mocap, de nouveaux scans photo ni de benchmark FPS matériel garantis.

## 1.9.0 — 17 novembre 2026 — sécurité de réception et vrai textile du coureur

- Après inspection de la capture de saut : maintien de la caméra lissée au-dessus de la piste pour supprimer le grand vide bleu, et ski topsheet UV bleu nuit / graphite avec motif compétition original à la place du matériau orange prototype.

- Après les cinq crêtes majeures de Super-G, les portes sont décalées hors de l'appel (-18 m) et d'une zone libre de réception (+80 m), avec intervalle minimal de 36 m ; ces marges sont des choix de gameplay et ne remplacent pas les règles FIS.
- La teinture bleue des deux bords devient irrégulière et texturée comme un colorant pulvérisé, avec barres de repérage aux abords des sauts et guides autour des portes ; toutes les bandes partagent un mesh.
- Skieur glTF à 18 os conservé mais désormais réellement **texturé** : UV propres avec coutures cylindriques, PNG albédo intégrés au GLB pour trame technique, éléments carbone, dossard n°61 et masque réfléchissant.
- Nouvel habillage de combinaison bleu glacier / bleu nuit et liserés turquoise, sans recopier des sponsors ou modèles propriétaires.
- Tests de structure PNG/GLB et UV, assertions de sécurité de l'espacement, vérification navigateur des surfaces texturées et du colorant atomisé.
- Les textures sont originales et restent un progrès semi-réaliste : aucun photo-scan ni mocap haute précision revendiqué.

## 1.8.0 — 16 novembre 2026 — Super-G sinueux et vrai geste de chronométrage

- Nouvelle ligne centrale de vitesse qui s'enroule à travers plusieurs vallons ; le sol, les bords neigeux, les filets et les portes suivent la même trajectoire.
- Espacement des portes SG non uniforme (minimum >25 m), portes ouvertes 7,6 m / verticales 10 m, alternance rouge/bleu inchangée.
- Marquages bleus continus de part et d'autre de la piste, rappels sur bosses et aux portes, tous épousant le terrain et regroupés en un mesh.
- Évolution originale du paysage : forêt d'épicéas, glacier dénudé, roche d'arête, puis zone d'arrivée, avec rochers groupés et panneaux de secteur.
- Fanions textiles incurvés et structurés, textures originales 1024×512 tissées avec ourlets et œillets. Toujours des piquets flexibles amortis au contact.
- Départ plus ressemblant à une cabane de compétition avec parois jaunes originales, cadres, compteurs et portillon amorti à ouverture lors du passage.
- Fin du geste de célébration : le coureur tend la main vers l'avant et vers le bas pour rencontrer une cellule photoélectrique. Interruption de faisceau et chrono interpolés à l'intérieur du tick 120 Hz.
- Replays précédents compatibles grâce au champ d'animation facultatif `finishReach`. Tests du chronométrage, des nouvelles courbes et captures Chromium.
- L'ensemble reste original, sans assets CarveMania ni logo sponsor non autorisé ; ni photoréalisme AAA ni homologation officielle revendiqués.

## 1.7.0 — 16 novembre 2026 — Super-G entièrement repensé

- Course originale `Glacier Express` étendue à 1 980 m avec 34 portes alternées, virages espacés, reliefs de compression et cinq bosses importantes.
- Relief terrain identique dans l'image et dans les calculs de physique ; décollage naturel automatique au franchissement rapide d'une crête, trajectoire balistique et amortissement de la réception. Simulation stable à 120 Hz, sans prétention à l'homologation.
- Portes de Super-G à quatre piquets visuels et deux petits panneaux textiles de taille inspirée des prescriptions FIS ; les deux pivots internes gardent les collisions/ressorts antérieurs.
- Original chalet de départ Super-G, portillons chrono articulés, barrettes de couleur et marquages bleus à l'approche des sauts.
- Animation du skieur : impulsion sur les bâtons au départ, flexion en vol, épaules qui accompagnent le piquet, main levée après la ligne d'arrivée. Résultat légèrement différé en SG pour rendre la célébration visible.
- Traces SL/GS/DH, records et anciens replays préservés ; nouvelles données d'animation enregistrées comme champs optionnels.
- Tests unitaires dédiés au terrain, aux portes, aux décollages et test Chromium du départ, de la piste et du matériel.
- Sources de référence consultées : FIS ICR 2024 / broadcaster manual et les vidéos fournies par le joueur ; aucune texture, logo ou moteur propriétaire copié.

## 1.6.0 — 16 novembre 2026 — intégration sélective des fichiers fournis

- Nouvel état `skid` avec perte puis récupération progressive d'adhérence, effet réduit pour rester jouable ; prise de carre progressive conservée.
- Mesure de `pressure` depuis la courbure du terrain, compression visuelle du skieur, légère vibration de caméra et FOV croissant avec la vitesse.
- Zones de neige fraîche/poudreuse déterministes sur les bords de piste et sous la neige, avec adhérence et freinage spécifiques ; affichage du type de neige dans le HUD.
- Distinction des chocs de protections de tibia et de bras sur les piquets, résonance élastique amortie de leur pointe supérieure et réactions corporelles déjà existantes conservées.
- Deux nouvelles couches de son procédural (vibration des carres et souffle de poudreuse), sans remplacer les MP3 ElevenLabs intégrés.
- Deux nouveaux canaux optionnels dans les replays, compatibles avec les sauvegardes V1.5.
- Tests de non-régression et validations GitHub Actions avant publication.
- Éléments issus de deux propositions utilisateurs (`alpine-ski-pro-v1.5.patch` et `alpine-ski-pro-v1.5-fichiers.zip`) intégrés de manière sélective, sans écraser l'avatar V1.5.

## 1.5.0 — 16 novembre 2026

- Carving : transfert de poids dépendant de la vitesse, adhérence modulée par la charge et vibrations déterministes sur neige dure.
- Animations : articulation de jambes et chevilles affinée, bassin plus engagé, compensation du torse et réaction aux collisions de piquets.
- Portes : deuxième section souple, flexion non linéaire et retour élastique ; règles et chronométrage préservés.
- Audio : frottement granuleux synthétique sur carres fortement sollicitées ; MP3 ElevenLabs carving toujours absent.
- Replays : nouvelles données de posture enregistrées et interpolées, anciennes sauvegardes compatibles.
- Tests supplémentaires de simulation, replay et rendu navigateur.

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
