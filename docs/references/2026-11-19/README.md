# Validation de publication — 19 novembre 2026

V1.17 a été déployée après validation CI de la PR #42. La PR #43 corrige uniquement le banc de test sans GPU et ne change pas le bundle du jeu ; ses 174 tests unitaires et 7 tests navigateur passent sans assertions PlayCanvas.

## Défaut détecté sur le site public

`public-before-audio-fix.json/png` proviennent de GitHub Pages. Le jeu démarre (42 portes, chrono, clavier, API DEV absente) mais émet quatre 404 vers des MP3 optionnels inexistants : carving, ice, wind et crowd-long. Les synthèses Web Audio assurent déjà le repli sonore. La validation précédente sur Vite n’avait pas révélé les erreurs réseau car le serveur répondait avec une page HTML HTTP 200.

## Correctif V1.17.1

`src/game/audio.ts` demande uniquement les six fichiers réellement livrés ; les sons procéduraux restent actifs. Pour un futur pack, ajouter les fichiers autorisés et les enregistrer dans `PACKAGED_SOUNDS`.

`tests/browser/game.spec.ts` vérifie le statut ET le type MIME des réponses audio : un faux fichier HTML servi avec HTTP 200 échoue désormais au test. Le contrôle clavier/pause/redémarrage/combinaison avec cette vérification a réussi (1 test, 1,1 min). La compilation TypeScript/Vite a réussi.

`static-after-audio-fix.json/png` proviennent du bundle compilé, servi par `python3 -m http.server 4174 --bind 127.0.0.1 --directory dist`. Aucun repli HTML : les assets absents produiraient de vraies 404. Contrôle réussi : zéro erreur JS/console/HTTP, chrono actif, commandes, 42 portes et API DEV absente.

Reproduction après compilation et lancement du serveur statique :

```sh
node scripts/verify-production.mjs
```

Le même script accepte l’URL du site public puis le préfixe de sortie JSON/PNG. Les statuts CI et déploiement sont à consulter dans la PR du correctif, sans les déduire du succès local. Les captures montrent le rendu Low logiciel ; elles ne constituent pas une mesure GPU matériel.
