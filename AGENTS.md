# Alpine Ski Pro — instructions de reprise

## Objectif et continuité

Construire progressivement un vrai simulateur de ski navigateur, sans installation chez le joueur. Préserver PlayCanvas + TypeScript + Vite et les fonctionnalités existantes. Lire README.md, docs/STATUS.md et docs/ROADMAP.md avant de modifier le jeu. Ne pas repartir de zéro.

## Travail

- Branche de référence pour la V1 : main après fusion de release/v1-solid-base. Le workflow déploie cette branche pour les versions de développement, ainsi que main. Les modifications V1 explicitement autorisées peuvent être fusionnées après validation de CI ; documenter précisément la publication.
- npm ci ; npm test ; npm run build ; npm run test:e2e. Dans ce Cloud : CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e.
- Simulation pure à 120 Hz dans src/game. Ne jamais faire dépendre la physique du taux de rendu.
- Les collisions de piquets (src/game/poles.ts) et la validation des portes (race.ts) sont distinctes : un impact légal ne disqualifie pas.
- La vue est dans src/render ; l'interface et le profil dans src/ui et src/game/storage.ts.
- Les contrôles de test window.__ski n'existent qu'en mode Vite DEV, jamais en production.
- Toute ressource ajoutée doit être originale ou disposer de provenance/licence vérifiée, enregistrée dans docs/ASSETS.md. Les sons ElevenLabs ne sont pas CC0.
- Ne pas promettre un rendu AAA, une certification FIS, 60 FPS, ni un backend mondial non mesuré ou absent.
- Un test CPU/Chromium SwiftShader ne constitue pas un benchmark GPU joueur.
- Mettre à jour STATUS et ROADMAP après chaque session, avec le résultat des vérifications et les limites honnêtes.
- L'utilisateur autorise le développement et la publication de versions jouables sur ce dépôt. Continuer les améliorations demandées sans redemander cette autorisation.
