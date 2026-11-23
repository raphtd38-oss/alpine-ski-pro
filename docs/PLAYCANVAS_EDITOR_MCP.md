# Alpine Ski Pro — Connecter PlayCanvas Editor à un agent visuel (sans Work)

Cette branche prépare la connexion **PlayCanvas Editor + Codex** sous Windows. Elle ne modifie pas le jeu public, et **ne crée pas automatiquement un projet sur ton compte PlayCanvas**. La connexion n'est pas active tant que le PC n'a pas été configuré.

## Prérequis PC
- Navigateur Chrome/Edge et connexion à https://playcanvas.com/editor .
- Node.js 22.18+ : https://nodejs.org/ .
- Codex (application/CLI compatible MCP) sur le même PC.
- Pour Codex CLI : dans un terminal Windows, `npm install -g @openai/codex`, puis se connecter avec son compte ChatGPT.
- Ouvrir le dossier local de **cette branche** `setup/playcanvas-mcp-editor` dans Codex et marquer le projet comme fiable, afin que le fichier `.codex/config.toml` soit utilisé.

## Connexion
1. Dans PlayCanvas, créer un **nouveau projet de test**, nommé par exemple `Alpine Ski Pro - Départ Coupe du monde TEST` (ne pas remplacer le jeu actuel).
2. Ouvrir le projet dans l'éditeur visuel.
3. En bas de la barre d'outils, cliquer **MCP** ; vérifier le **port 52000**, cliquer **Connect**. Accepter **Apps on device** si Chrome/Edge le demande.
4. Garder Codex en fonctionnement sur le même PC, dans le dépôt configuré. Vérifier que l'outil PlayCanvas est disponible.
5. Première demande en lecture seule à l'agent : `Inspecte la scène PlayCanvas connectée et décris ses objets, son cadrage et l'état de versionnement. Ne modifie rien.`
6. Faire un checkpoint avant modification. Ensuite demander la création d'une scène de départ distincte, les placements, puis les captures du viewport et de l'application pour contrôler le résultat.

## Demande à donner à Codex
```
Utilise le MCP PlayCanvas connecté, pas uniquement des modifications de code.
Crée un projet de test « Alpine Ski Pro – Départ Coupe du monde » sans modifier la production.
Crée une scène visuelle de départ Super-G réaliste avec cabine, un coureur, un coureur suivant à l'échauffement, deux entraîneurs et cinq caméras TV.
Organise une cinématique d'environ 10 secondes avant le GO. Les mouvements doivent durer naturellement ; ne ralentis pas artificiellement toutes les animations.
Place les objets dans l'éditeur, inspecte le viewport, lance le rendu, capture les vues et corrige les éléments mal cadrés.
Avant toute modification majeure, crée un checkpoint. Ne remplace pas le skieur 25 os ni le jeu officiel.
Dis clairement quels modèles et animations sont temporaires et ce qui reste visuellement à améliorer.
```

## Limites importantes
- Une scène créée dans PlayCanvas Editor est un **nouveau projet** ; le dépôt TypeScript/Vite existant **ne s'importe pas automatiquement** dans l'éditeur. Une migration est un travail séparé.
- Le MCP local relie Codex au **PlayCanvas Editor ouvert sur ton PC**. Il ne permet pas à une conversation ChatGPT iPhone non connectée de cliquer dans ce navigateur.
- Le MCP agit sur le projet PlayCanvas effectivement ouvert : vérifier son nom avant modification.
- Si le port est bloqué, autoriser **Apps on device**, vérifier que Codex et l'éditeur tournent sur le même PC, et qu'une seule fenêtre PlayCanvas est reliée.

Sources officielles :
- https://developer.playcanvas.com/user-manual/editor/mcp-server/
- https://learn.chatgpt.com/docs/extend/mcp
