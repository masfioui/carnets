// Point d'entrée de l'appli.
// 1. charge trips/index.json puis chaque voyage ;
// 2. lit l'adresse (la partie après #) pour savoir quel écran afficher ;
// 3. redessine l'écran et distribue les clics aux bonnes fonctions.
//
// Adresses : "#/" = accueil, "#/v/istanbul/jours" = onglet Jours du carnet Istanbul.

import * as store from './store.js';
import { icon } from './icons.js';
import { esc, periode, rappelsEnAttente } from './util.js';
import { fermerFeuille, toast } from './feuille.js';
import { ouvrirCalendrier } from './calendrier.js';
import { ouvrirLieu } from './lieu.js';
import { actualiserTaux, tauxPerime } from './taux.js';
import * as accueil from './views/accueil.js';
import * as jours from './views/jours.js';
import * as lieux from './views/lieux.js';
import * as budget from './views/budget.js';
import * as guide from './views/guide.js';
import * as listes from './views/listes.js';

const VUES = { jours, lieux, budget, guide, listes };
const ONGLETS = [
  ['jours', 'Jours', 'calendar'],
  ['lieux', 'Lieux', 'pin'],
  ['budget', 'Budget', 'wallet'],
  ['guide', 'Guide', 'book'],
  ['listes', 'Listes', 'list'],
];

const racine = document.getElementById('app');
const barre = document.getElementById('onglets');

let index = { voyages: [] };
const voyages = {};   // contenu des fichiers trips/*.json, par id
const memoire = {};   // état d'affichage (jour choisi, filtre…), perdu à la fermeture
let vueCourante = accueil;
let ctx = null;       // "contexte" passé à la vue affichée

async function charger() {
  index = await (await fetch('trips/index.json')).json();
  await Promise.all(index.voyages.map(async (fiche) => {
    try {
      voyages[fiche.id] = await (await fetch('trips/' + fiche.fichier)).json();
    } catch (erreur) {
      console.warn('Voyage illisible : ' + fiche.fichier, erreur);
    }
  }));
}

function lireAdresse() {
  const [, type, id, onglet] = location.hash.split('/');
  if (type === 'v' && voyages[id]) return { id, onglet: VUES[onglet] ? onglet : 'jours' };
  return null;
}

// Redessine tout l'écran. Appelé à chaque changement d'adresse.
function afficher() {
  fermerFeuille();
  const adresse = lireAdresse();

  if (!adresse) {
    vueCourante = accueil;
    ctx = { index, voyages, store, rendre: afficher };
    document.documentElement.style.removeProperty('--accent');
    barre.hidden = true;
    racine.innerHTML = accueil.rendre(ctx);
    accueil.monter?.(racine, ctx);
    return;
  }

  const voyage = voyages[adresse.id];
  vueCourante = VUES[adresse.onglet];
  ctx = {
    voyage,
    etat: store.etat(voyage.id),
    ui: (memoire[voyage.id] ??= {}),
    sauver: store.sauver,
    rendre: rendreVue,
  };
  document.documentElement.style.setProperty('--accent', voyage.accent || '#E0A458');

  racine.innerHTML = `
    <header class="entete">
      <a class="rond" href="#/" aria-label="Mes carnets">${icon('chevron-left')}</a>
      <div>
        <div class="entete-titre">${esc(voyage.nom)}</div>
        <div class="entete-sous">${esc(voyage.pays)} · ${periode(voyage.dates.debut, voyage.dates.fin)}</div>
      </div>
    </header>
    <main id="vue"></main>`;

  barre.hidden = false;
  barre.innerHTML = ONGLETS.map(([cle, nom, icone]) => `
    <a class="onglet ${cle === adresse.onglet ? 'actif' : ''}" href="#/v/${voyage.id}/${cle}">
      ${icon(icone, 24)}<span>${nom}</span>
    </a>`).join('');

  rendreVue();
  majTauxAuto(voyage, ctx.etat);
}

// Redessine seulement le contenu de l'onglet (après une case cochée par exemple).
// La position de défilement est conservée.
function rendreVue() {
  const zone = document.getElementById('vue');
  if (!zone) return afficher();
  zone.innerHTML = vueCourante.rendre(ctx);
  vueCourante.monter?.(zone, ctx);
}

// Met le taux à jour en arrière-plan quand il y a du réseau.
async function majTauxAuto(voyage, etat) {
  if (!navigator.onLine || !tauxPerime(etat)) return;
  try {
    await actualiserTaux(voyage, etat);
    store.sauver();
    if (ctx && ctx.voyage === voyage && vueCourante === budget) rendreVue();
  } catch {
    // Pas grave : on garde le dernier taux connu.
  }
}

// Un seul écouteur de clics pour toute l'appli. Chaque bouton porte un attribut
// data-action="nom" ; on cherche la fonction du même nom dans la vue affichée.
const actionsCommunes = {
  'fermer-feuille': () => fermerFeuille(),
  'fermer-fond': (el, c, e) => { if (e.target === el) fermerFeuille(); },
  lieu: (el, c) => ouvrirLieu(c, el.dataset.lieu),
  calendrier: (el, c) => {
    const rappels = rappelsEnAttente(c.voyage, c.etat.coches);
    if (!rappels.length) return toast('Aucun rappel en attente');
    ouvrirCalendrier(c.voyage, rappels);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = vueCourante.actions?.[el.dataset.action] ?? actionsCommunes[el.dataset.action];
  if (action) action(el, ctx, e);
});

window.addEventListener('hashchange', () => {
  afficher();
  window.scrollTo(0, 0);
});

// Le service worker met l'appli en cache pour le hors-ligne. En local on ne
// l'active qu'avec ?sw=1, sinon il servirait d'anciennes versions pendant le développement.
const enLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!enLocal || location.search.includes('sw=1'))) {
  navigator.serviceWorker.register('sw.js').catch((erreur) => console.warn('Service worker', erreur));
}

charger()
  .then(afficher)
  .catch((erreur) => {
    console.error(erreur);
    racine.innerHTML = '<p class="chargement">Impossible de charger les carnets. Vérifie ta connexion puis rouvre l’appli.</p>';
  });
