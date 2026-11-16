# Alpine Ski Pro — instructions pour Copilot et autres agents IA

Le point d'entrée canonique est **AGENTS.md** à la racine. Lire ensuite :
- docs/RESOURCE_CATALOG.md : bibliothèques 3D/PBR/animations, licences et outils.
- docs/ASSET_WORKFLOW.md : recettes Blender → GLB → inspection → optimisation → tests.
- docs/ASSETS.md : ressources réellement livrées et leurs droits.
- docs/STATUS.md et docs/ROADMAP.md : statut réel et prochaine livraison.

La pile est **PlayCanvas 2.24.1, TypeScript, Vite**. Ne pas remplacer le moteur ni casser la simulation de ski déterministe à 120 Hz.

Avant d'importer un fichier visuel, vérifier sa licence précise et enregistrer sa provenance. Chercher des CC0 via la commande assets:search, auditer via assets:audit et inspecter les GLB. Séparer une source simplement trouvée sur Internet d'une ressource effectivement installée, validée et intégrée.

Commandes : npm ci ; npm run assets:alpine ; npm run assets:audit ; npm test ; npm run build ; npm run test:e2e. Ne pas créer de comptes, achats ou secrets à la place du propriétaire. Pas de copie d'assets de CarveMania et aucune promesse de photoréalisme/FPS sans tests.
