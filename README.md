# Carnets de voyage

Appli web installable sur téléphone : planning jour par jour, lieux avec lien Google Maps, convertisseur de devises, budget, phrases utiles à écouter, plats, arnaques, urgences et check-lists. Fonctionne hors ligne.

Pas de framework, pas de build : ouvre les fichiers, tout est lisible.

## Tester sur l'ordinateur

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Puis ouvrir http://localhost:8123/ dans le navigateur.

## Ajouter un voyage

Dans Claude Code, depuis ce dossier :

```
/nouveau-voyage Lisbonne, du 12 au 16 mai, 2 personnes
```

Le processus complet est décrit dans `CLAUDE.md`.

## Installer sur iPhone

1. Ouvrir le lien GitHub Pages dans Safari.
2. Bouton Partager, puis « Sur l'écran d'accueil ».
3. Ouvrir une fois l'appli avec du réseau : elle est ensuite disponible hors ligne.

Les cases cochées et les dépenses sont stockées sur le téléphone. Le bouton « Sauvegarder » de l'accueil en fait une copie.
