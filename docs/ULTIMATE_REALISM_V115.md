# Alpine Ski Pro V1.15 — Ultimate Realism (première intégration)

Cette version est une amélioration technique vérifiable, **pas** un jeu AAA terminé, une motion capture, ou un jumeau numérique de Cortina.

## Audit technique avant modifications

- Dépendances réelles du dépôt : PlayCanvas 2.24.1, TypeScript 5.9.3, Vite 8.3.8, Vitest 4.0.18, Playwright 1.58.2.
- Skieur d'origine 25 os, animation procédurale SuperGCompetitionPose, IK 3D SuperGRacePoseDirector, skis et chaussures attachés au rig, ghost classique intact.
- Physique personnalisée à pas fixe 120 Hz ; Ammo.js optionnel pour les capteurs et rendu WebGPU conditionnel avec fallback WebGL2. Aucun remplacement injustifié par Rapier/Three.js.
- Parcours Cortina 2 105 m / 635 m (reconstruction artistique non GPS), 34 portes jouables, fanion déformable et seuil de chute strict >45% dans banner-contact.ts, horaires et replays inchangés.
- Neige PBR CC0 Snow 02 de Poly Haven déjà présente et assets existants réutilisés ; aucun achat ni binaires nouveaux importés.

## Changements réellement codés

### Biomécanique / skis

- Nouveau modèle superg-load-transfer.ts : rayon effectif de virage, accélération latérale plafonnée, angle d'équilibre, équilibre des appuis, déport du bassin, réponse à vitesse, pression, adhérence et dérapage.
- Le solveur des 25 os utilise ces estimations et la charge de la simulation : flexion/angulation distincte du body bank, charge du ski extérieur plus élevée, carres gauche/droite non identiques, dérive/heading et transferts amortis.
- Diagnostic de charge gauche/droite, accélération latérale et rayon pour tests de navigateur. Ces chiffres sont des *estimations visuelles*, pas des mesures GNSS de Coupe du monde.

### Projecteurs réels

- Les 15 mâts à LED emploient désormais des composants PlayCanvas de type spot orientés vers la piste selon l'axe local -Y, éclairant le véritable matériau PBR.
- 1 spot actif en Low, 2 en Medium, 3 en High et 4 en Ultra, sélectionnés par distance ; les autres ampoules restent visuellement allumées.
- Un maximum d'une carte d'ombres locale (256/512 px) en High/Ultra ; aucune en Low/Medium. Les intensités montent au fur et à mesure de la descente, simulant un coucher de soleil progressif (pas d'horloge astronomique).
- Les spots réels remplacent les omni décoratifs, sans superposition de 15 lumières coûteuses.

### Neige et micro-relief PBR

- Correction de l'appui du ski extérieur lors des virages à droite : la charge state.load de la physique est celle du ski GAUCHE ; la charge du ski droit est 1 - state.load.
- Gerbe dominante sur le ski chargé, pression et glissement modulent les cristaux, vitesse, réception, chute et qualité du manteau neigeux. Maintien des budgets Low/Medium/High/Ultra.
- Normal-map procédurale de roche calcaire au coucher du soleil (128/256/384 px, selon la qualité) avec UV dédiés, bump et anisotropie. Aucune photo ou texture propriétaire.
- La texture créée est libérée lors du nettoyage de la scène.

## Ce qui a été préservé

La silhouette du skieur existant, le rig 25 os, les 34 portes, le contact fanion et le seuil de 45 %, les animations de chute, la ligne bleue, le chronomètre, le départ/arrivée, le ghost, les replays et la simulation à 120 Hz.

## Tests et validation

GitHub Actions : npm ci, audit des assets CC0, npm test, npm run build (TypeScript), npm run test:e2e sur Chromium, screenshots de la course et du skieur à appui.
Tests dédiés : ultimate-biomechanics-lighting.test.ts et browser/ultimate-realism.spec.ts. La console ne doit pas contenir de pageerror.
Captures générées dans l'artefact browser-evidence : ultimate-cortina-spotlight-start.png et ultimate-cortina-loaded-carve.png, à comparer aux captures des runs main antérieurs.
**La CI Chromium peut être rendue sur SwiftShader : elle ne mesure pas des FPS matériels véridiques PC ou iPhone.** Ne déclarer aucune performance GPU sans un benchmark sur les appareils.

## Limitations / backlog

- Ne pas appeler cette reconstruction une piste relevée : le GPS réel des 43 portes et le DEM terrain ne sont pas dans le jeu.
- Affiner le solveur avec de vraies vidéos ou télémétries autorisées, mesurer les dégagements de semelles et les courbes de charge sur plusieurs bosses.
- Remplacer à terme certains pics procéduraux par matériaux rocheux photogrammétriques licenciés et LOD appropriés.
- Mesurer visuellement l'angle des skis, la lisibilité des portes, la portée/ombres réelles des spots et FPS sous WebGL2, WebGPU et mobile.

Références de l'API PlayCanvas :
https://developer.playcanvas.com/user-manual/graphics/lighting/lights/
https://api.playcanvas.com/engine/classes/LightComponent.html
https://api.playcanvas.com/engine/classes/StandardMaterial.html

Aucun asset ou code de CarveMania et aucune génération payante ne sont utilisés.