# V1.11 — départ du Super-G et revue d'assets (17 novembre 2026)

## Conception et sécurité
Le départ de **Glacier Express** est une création originale inspirée de séquences de courses professionnelles, pas une installation homologuée. La V1.10 ne doit pas être régressée.

La référence FIS actualisée est *Timing Booklet Alpine, Para Alpine*, **v2.67, 16 juin 2026** :
https://assets.fis-ski.com/f/252177/x/7e6bba2b44/timing_booklet_alpine_para_alpine.pdf
Voir en particulier §§16.2, 16.2.2, pp. 41-44. Pour le ski alpin valide : un seul portillon physique de départ, avec un contact A/B distinct au niveau réel (jeu : simulation d'un seul chrono), tige 50–80 cm et hauteur 35–50 cm, impulsion entre 10° et 30°. La tige reste ouverte après l'impulsion (pas de ressort de retour pendant la course).

Notre approximation de jeu : tige **70 cm**, placée à **43 cm** de la neige, seuil électrique **20°**, rotation visuelle plafonnée à **68°**, réarmement uniquement au départ d'une nouvelle course. L'impulsion est calculée au passage du skieur dans une bande de contact, avec interpolation du tick fixe de **1/120 s**. Un joueur passant hors de cette bande ne déclenche pas un faux temps; les tests gèrent le passage standard. Le système ne simule pas les équipements homologués, les deux circuits électriques ni les conditions d'homologation.

## Modifications
- Remplacement de l'ancienne cabane très large et ouverte à l'arrière par une cabane 3D **fermée sur les côtés et à l'arrière**, ouverture de course étroite devant, murs à planches texturées, vraie géométrie de toiture à deux pentes, poutres et rivets, tapis neigeux à doubles traces, protections et panneaux ALPINE SKI PRO fictifs.
- Une seule tige montable et pivotante (contre deux grosses tiges en V1.10) ; le chronométrage SG commence réellement après son franchissement, non à l'affichage GO.
- Départ en **trois impulsions bipolaires synchronisées** avec le même modèle temporel que le moteur physique. Épaules, coudes, poignets et extension des jambes contribuent. Les deux bâtons suivent un point de contact à la neige lors des poussées en fonction de la hauteur réelle du terrain. Déclenchement de sons originaux à chaque contact et discret clic à l'ouverture.
- Tubes d'origine à centre incurvé pour les bâtons SG, pas de modèle tiers sous droits.
- Les courbes, les quatre disciplines, les replays, l'absorption et les records restent basés sur les modules existants.

## Audit des trois archives fournies
- **Alpine Ski Pro Studio Kit 2026** : éléments V1.10 déjà adoptés sélectivement (voir STUDIO_KIT_2026.md). Bois PBR et matériaux du kit étudiés ; la cabane V1.11 utilise une texture de bois originale générée au runtime pour limiter le coût réseau.
- **Alpine SuperG Racer Pro Kit 2026** : variante `ASP_SUPERG_RACER_RIGGED_FULL_212.glb` 15.09 Mo avec **146 meshes**, **25 os** et neuf clips procéduraux; variante `MOBILE_512` 1.95 Mo mais **146 meshes** toujours. Aucun clip n'est une mocap. Les noms d'os, axes locaux et bind poses ne sont pas compatibles directement avec les 17 articulations pilotées par Athlete. Ne **pas** écraser le GLB actuel tant qu'un retarget, l'attachement des skis et des benchmarks Chromium/iPhone ne sont pas validés.
- **blender-mcp-alpine-ski(2)** : scripts et documentation d'outillage, pas de modèle de remplacement et pas de connexion Blender desktop active prouvée.
- La permission de retirer un asset moins bon ne justifie pas la suppression de ressources encore utilisées. L'ancienne géométrie de cabane a été remplacée **dans le code** et n'est plus instanciée. Aucun nouveau binaire externe n'est ajouté.

## Validation
- Tests unitaires nouveaux : `tests/start-gate-v111.test.ts`.
- Test navigateur existant renforcé : `tests/browser/superg.spec.ts` (tige unique, déclenchement physique et timer).
- Workflow GitHub Actions `Verify and publish` doit réussir npm ci, assets:alpine, assets:audit, npm test, npm run build, npm run test:e2e avant fusion et publication.
- Limites : pas de simulation multibody du portillon, pas de mocap, pas de calibration vidéo image par image, pas de FIS certification ni de mesures FPS réelles sur iPhone. Les captures Playwright doivent être examinées avant une annonce de qualité visuelle définitive.
