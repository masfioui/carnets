---
description: Crée un nouveau carnet de voyage (destination, dates, ou lien YouTube) et le déploie
argument-hint: <destination, dates, voyageurs> ou <lien YouTube>
---

Crée un nouveau carnet de voyage dans cette appli à partir de : $ARGUMENTS

Suis le processus « Créer un nouveau voyage » et les « Règles de fiabilité » de `CLAUDE.md`, sans sauter d'étape :

1. Lis `CLAUDE.md` et `trips/istanbul.json` (le modèle).
2. S'il manque la destination, les dates, le logement ou les heures d'arrivée et de départ, pose toutes tes questions en une seule fois avant de chercher quoi que ce soit.
3. Si la demande contient un lien YouTube ou une transcription : extrais uniquement les lieux, adresses, prix et conseils. Ne résume pas et ne raconte pas la vidéo. Si tu ne peux pas lire la transcription, demande à l'utilisateur de la coller.
4. Vérifie sur le web chaque prix, horaire, jour de fermeture, taux de change et numéro d'urgence. Note la date et la source. Ce qui n'est pas vérifiable est marqué « à vérifier », jamais inventé.
5. Calcule le jour de la semaine de chaque date et construis le planning autour des fermetures, de la saison et du logement. Propose mieux que ce qui est demandé si tu as une vraie raison, et dis-le.
6. Écris `trips/<id>.json`, ajoute l'entrée dans `trips/index.json`.
7. Valide avec `tools/validate.html` (titre de l'onglet : `VALIDE`), puis teste le carnet en 390 × 844 sans erreur console.
8. Commite et pousse. Termine par un court bilan : ce qui reste à vérifier, ce qu'il faut réserver, et le rappel d'ouvrir l'appli deux fois pour voir le nouveau carnet.
