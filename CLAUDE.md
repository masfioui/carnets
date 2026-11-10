# Carnets de voyage

Appli web perso (PWA) qui affiche des carnets de voyage sur téléphone. Le propriétaire est étudiant ingénieur, francophone : réponds en français, explique tes choix simplement, il veut comprendre le code.

## Principes à ne pas casser

- **Aucun framework, aucune étape de build.** HTML, CSS et JavaScript en modules ES, lisibles tels quels. Noms et commentaires en français.
- **Le contenu est séparé du code.** Un fichier `trips/<id>.json` par voyage, listé dans `trips/index.json`. Ajouter un voyage ne demande jamais de toucher au JavaScript.
- **Les données perso restent sur le téléphone** (localStorage, clé `carnets.v1`, voir `js/store.js`). Ne jamais changer le format des clés de cases cochées (`act:<id>`, `plat:<id>`, `avant:<id>`, `valise:<id>`) ni renommer un `id` déjà déployé : ça effacerait les coches de l'utilisateur.
- **Design** : sombre et sobre, pensé pour 390 px de large (iPhone 13), zones tactiles d'au moins 44 px, icônes SVG au trait (`js/icons.js`), pas d'emoji.
- **Animations** (fin de `css/style.css`) : seulement `transform` et `opacity`. Les animations d'entrée vivent sous la classe `.entree`, posée par `js/app.js` quand on change d'écran (`ctx.rendre(true)`), jamais quand on coche une case. Tout est coupé par `prefers-reduced-motion`.

## Arborescence

```
index.html              page unique
css/style.css           tout le style
js/app.js               chargement, navigation par #, clics (data-action)
js/store.js             localStorage
js/taux.js              taux de change (API Frankfurter + saisie manuelle)
js/lieu.js              fiche d'un lieu
js/calendrier.js        export des rappels en fichier .ics (pas de notifications push : pas de serveur)
js/feuille.js           panneau du bas, toast, saisie d'un nombre
js/effets.js            vibration (astuce iPhone) et confettis de fin de journée
js/views/*.js           un fichier par écran : rendre(ctx), monter(racine, ctx), actions
js/validate.js          validateur du schéma
tools/validate.html     page qui valide tous les voyages
tools/serve.ps1         serveur local sans installation
tools/icone.ps1         redessine l'icône de l'appli (icons/)
sw.js                   service worker (hors-ligne)
trips/                  les voyages
```

## Règles de fiabilité (les plus importantes)

1. **Ne jamais inventer** un lieu, un prix, un horaire, une adresse ou un numéro. Chaque info chiffrée est cherchée sur le web au moment de la création.
2. **Chaque prix porte** `date` (jour de la vérification), `source`, `url` si possible, et `statut`.
3. `statut: "vérifié"` seulement si au moins deux sources récentes concordent, ou une source officielle. Sinon `"à vérifier"`. Sources contradictoires : donner la fourchette dans `texte` et mettre `"à vérifier"`.
4. Prix introuvable : `montant: null`, `texte: "Prix non trouvé"`, `statut: "à vérifier"`. Ne pas estimer.
5. **Pas de coordonnées GPS.** Le champ `maps` est une recherche « nom du lieu, ville » (de préférence le nom local), que l'appli transforme en lien Google Maps.
6. Vérifier les **jours de fermeture** contre les dates réelles du voyage (calculer le jour de la semaine de chaque date) et organiser le planning en conséquence. Signaler les pièges dans `alertes`.
7. Tenir compte de la saison (heure du coucher du soleil, météo, horaires d'hiver) et de l'emplacement du logement pour l'ordre des journées et les trajets.

## Créer un nouveau voyage

La commande `/nouveau-voyage` déroule ce processus. Résumé :

1. **Comprendre la demande** : destination, dates, nombre de voyageurs, logement, heures d'arrivée et de départ. Poser les questions qui manquent en une fois. Si les dates et le nombre de jours demandés ne collent pas, le dire.
2. **Vidéo YouTube** : si l'utilisateur donne un lien, tenter de lire la transcription ; en cas d'échec, lui demander de la coller. N'en extraire que les lieux, adresses, prix et conseils pratiques. **Ne jamais résumer ni raconter la vidéo** (pas de spoil). Tout ce qui vient de la vidéo est revérifié sur le web comme le reste ; la source est notée « vlog fourni ».
3. **Rechercher** prix, horaires, fermetures, transports, taux de change, arnaques connues, numéros d'urgence.
4. **Proposer mieux** : le but est que l'utilisateur se réveille en sachant quoi faire. Regrouper les lieux par quartier, limiter les trajets, prévoir un plan B par jour, dire franchement ce qui ne vaut pas le coup à cette saison.
5. **Écrire** `trips/<id>.json` en copiant la structure de `trips/istanbul.json` (c'est le modèle de référence). `id` en minuscules sans accent ni espace.
6. **Ajouter** l'entrée dans `trips/index.json` (`id`, `fichier`, `nom`, `pays`, `debut`, `fin`, `accent`). Choisir une couleur d'accent claire, lisible sur fond presque noir.
7. **Valider** : lancer le serveur (configuration `carnets` de `.claude/launch.json`), ouvrir `http://localhost:8123/tools/validate.html`. Le titre de l'onglet doit être `VALIDE`. Corriger toute erreur. Lire les avertissements : chaque « à vérifier » doit être un vrai manque de source, pas un oubli.
8. **Tester** dans le navigateur en 390 × 844 : accueil, les cinq onglets du nouveau carnet, une fiche de lieu, aucun débordement horizontal, aucune erreur dans la console.
9. **Déployer** : `git add`, commit clair en français, `git push`. GitHub Pages republie tout seul en une à deux minutes.
10. **Dire à l'utilisateur** ce qui reste « à vérifier », ce qu'il doit réserver à l'avance, et qu'il faut ouvrir l'appli deux fois avec du réseau pour voir le nouveau carnet (voir Service worker).

## Schéma d'un voyage

Le validateur `js/validate.js` fait foi. Champs principaux :

- En-tête : `schema` (1), `id`, `nom`, `pays`, `ville`, `dates {debut, fin}`, `accent`, `voyageurs`, `majLe`.
- `devise {code, symbole, nom, taux, date, source}` : `taux` = unités locales pour 1 euro.
- `langue {code, nom}` : code du type `tr-TR`, utilisé par la synthèse vocale.
- `logement {nom, adresse, maps, note}`.
- `aSavoir[] {titre, texte, date, source, statut}`.
- `lieux[] {id, nom, categorie, quartier, maps, prix?, horaires?, fermeture?, duree?, conseil?}`
  - `categorie` : `visite`, `manger`, `balade`, `shopping`, `option`, `pratique`.
  - `prix {texte, montant, devise, date, source, url?, statut}` ; `montant` = nombre, `0` si gratuit, `null` si inconnu.
  - `horaires {texte, statut}`.
- `jours[] {date, titre, resume, alertes[], matin[], apresMidi[], soir[], planB}`
  - activité : `{id, lieu? | titre?, heure?, duree?, trajet?, note?, optionnel?}`. `lieu` renvoie à un `id` de `lieux`. Les trois listes existent toujours, vides si besoin.
- `phrases[] {cat, fr, local, prononciation}` (au moins 10), `plats[] {id, nom, description, ou}` (au moins 5).
- `arnaques[] {titre, texte, parade}`, `urgences[] {nom, numero | null, maps?, note, source, statut}`.
- `checklist {avant[], valise[]}` : éléments `{id, texte, note?, echeance?}`.
  - `echeance` (date limite, AAAA-MM-JJ, au plus tard le jour du départ) transforme l'élément en **rappel** : il remonte sur l'accueil et l'onglet Jours quand il reste 7 jours ou moins, et part dans le fichier calendrier (`js/calendrier.js`). Mettre une échéance à tout ce qui se réserve ou se prépare à l'avance (réservations, papiers, revérification des prix, enregistrement du vol), avec des dates réalistes par rapport au départ.
- `budget {devise: "EUR", prevu, categories[]}`.

## Photos

- Une photo par lieu, facultative, stockée dans le dépôt : `images/<voyage>/<idLieu>.jpg` (960 px de large). Pas de lien vers un site externe : l'appli doit marcher hors ligne.
- **Uniquement des photos sous licence libre** venant de Wikimedia Commons, avec crédit. Le lieu porte alors `photo {credit, licence, source}` ; les crédits s'affichent sur la fiche du lieu et dans Guide > Pratique.
- Processus : écrire `images/<voyage>/sources.json` (`{ "idLieu": "Titre de l'article Wikipedia anglais" }`), puis lancer `powershell -ExecutionPolicy Bypass -File tools\photos.ps1 -Voyage <voyage>`. Le script prend l'image principale de l'article, refuse les licences non libres, télécharge, et ajoute la ligne `photo` dans le JSON. S'il répond « trop de requêtes », attendre quelques minutes et relancer (il saute ce qui est déjà fait).
- **Regarder chaque photo** avant de publier : l'image principale d'un article de quartier montre parfois un autre endroit. Dans ce cas, supprimer le fichier, la ligne `photo` et l'entrée de `sources.json`. Mieux vaut pas de photo qu'une photo du mauvais lieu.
- Pas de photo pour les restaurants et commerces sans article : ne pas en chercher ailleurs.
- `couverture` (à la racine du voyage, et facultatif sur un jour) = `id` d'un lieu avec photo, utilisé comme image de la carte d'accueil ou de l'en-tête du jour. Sans `couverture`, un jour prend la photo de son premier lieu qui en a une.

## Service worker

`sw.js` sert le cache d'abord et se met à jour en arrière-plan : après un déploiement, la nouveauté apparaît à la **deuxième** ouverture.

- Nouveau voyage : rien à faire dans `sw.js`.
- Nouveau fichier JS, CSS ou icône : l'ajouter à la liste `SOCLE` **et** incrémenter `CACHE` (`carnets-v2`, etc.).
- En local le service worker est désactivé, sauf avec `?sw=1` dans l'adresse.

## Tester en local

Pas de Node ni de Python sur la machine d'origine. Le serveur est `tools/serve.ps1` (PowerShell), lancé par la configuration `carnets`. Toujours tester en 390 × 844 et vérifier la console avant d'annoncer qu'une étape est finie.

## Git

Commits courts en français, à l'impératif (« Ajoute le carnet Lisbonne »). Branche `main`, publiée par GitHub Pages depuis la racine.
