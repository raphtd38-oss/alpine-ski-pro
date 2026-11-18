# Cortina V1.16 — Refonte de la géologie visible

## Références

Le Schuss du parcours Olympia delle Tofane est caractérisé par un couloir étroit entre deux imposants massifs de calcaire, puis un parcours entre zones boisées et murs rocheux. Références pour validation visuelle : https://cortina.dolomiti.org/fr/piste/stratofana-olimpica-3/ et https://www.impianticortina.it/en/ski-slopes-tofana-area-cortina/ . Les photos servent de comparaison seulement ; elles ne sont pas copiées dans le jeu.

## Changements techniques

- `src/render/cortina-geology.ts` produit des structures **longitudinales** irrégulières plutôt que les anciennes tours quasi coniques. Chaque paroi contient une crête multi-sommet, des changements de coupe, des strates, des crevasses et des teintes de neige retenue à l'altitude.
- `src/render/cortina-scenery.ts` utilise désormais les mêmes parois pour l'entrée du Schuss et les affleurements de proximité, tout en conservant les chalets et la ligne de télésiège.
- `src/render/cortina-cinematic-detail.ts` emploie ce générateur pour les grands arrière-plans, avec la normal-map originale de V1.15 et UV réels.
- `src/render/cortina-snow-banks.ts` pose une bande de neige balayée par le vent de part et d'autre, à plus de 1,6 m au-delà du bord de course (le tracé et la physique de neige restent inchangés).
- Les arbres du maillage de conifères ont des troncs de bois et des ramifications légèrement penchées ; la densité reste celle des profils Low, Medium, High, Ultra.

## Correctness, assets et validation

- Les données topographiques, les 34 portes et la règle de collision des banderoles à 45 % ne sont pas modifiées.
- Le générateur pure TypeScript est testé sans GPU (finitude, indices, UV, déterminisme, profil de crête à plusieurs sommets et accumulation de plusieurs massifs dans un seul mesh).
- GitHub Actions doit exécuter les tests Vitest, la compilation TypeScript/Vite et Playwright/Chromium ; les captures de navigateur doivent être comparées à celles de V1.15 avant publication.
- La performance sur matériel GPU réel (iPhone/PC) et l'exactitude topographique / la licence de futurs actifs DEM ou PBR restent à vérifier séparément. Aucune photo ou marque d'ayant droit n'a été intégrée à l'archive du jeu.

Ce travail est une reconstruction visuelle originale, non une reproduction photogrammétrique exacte du site olympique.
