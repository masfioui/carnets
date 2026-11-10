// Onglet Lieux : tous les lieux du carnet, filtrables par catégorie.
// Un appui sur une ligne ouvre la fiche complète, le bouton rond ouvre Google Maps.

import { esc, mapsUrl, prixCourt } from '../util.js';
import { icon } from '../icons.js';

const CATEGORIES = [
  ['tous', 'Tous'],
  ['visite', 'Visites'],
  ['manger', 'Manger'],
  ['balade', 'Balades'],
  ['shopping', 'Shopping'],
  ['option', 'Options'],
  ['pratique', 'Pratique'],
];

export function rendre(ctx) {
  const { voyage, ui } = ctx;
  ui.categorie ??= 'tous';
  const presentes = new Set(voyage.lieux.map((l) => l.categorie));
  const puces = CATEGORIES
    .filter(([cle]) => cle === 'tous' || presentes.has(cle))
    .map(([cle, nom]) => `<button class="puce ${ui.categorie === cle ? 'actif' : ''}" data-action="filtrer" data-cat="${cle}">${nom}</button>`)
    .join('');

  const liste = voyage.lieux
    .filter((l) => ui.categorie === 'tous' || l.categorie === ui.categorie)
    .map((l) => {
      const prix = esc(prixCourt(l.prix, voyage.devise.symbole));
      const aVerifier = l.prix?.statut === 'à vérifier' || l.horaires?.statut === 'à vérifier';
      return `
        <div class="carte lieu">
          <div class="lieu-corps" data-action="lieu" data-lieu="${esc(l.id)}" role="button">
            <div class="lieu-nom">${esc(l.nom)}</div>
            <div class="lieu-infos">${[esc(l.quartier ?? ''), prix].filter(Boolean).join(' · ')}</div>
            ${l.fermeture ? `<div class="lieu-ferme">${esc(l.fermeture)}</div>` : ''}
            ${aVerifier ? '<div style="margin-top:7px"><span class="badge averifier">À vérifier</span></div>' : ''}
          </div>
          <a class="rond accent" href="${mapsUrl(l.maps)}" target="_blank" rel="noopener" aria-label="Y aller : ${esc(l.nom)}">${icon('nav', 20)}</a>
        </div>`;
    }).join('');

  return `
    <div class="puces">${puces}</div>
    <div style="margin-top:14px">${liste}</div>
    <p class="doux petit" style="margin:16px 2px 0">
      Infos vérifiées le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(voyage.majLe))}.
      Appuie sur un lieu pour voir le prix, les horaires et la source.
    </p>`;
}

export const actions = {
  filtrer(el, ctx) {
    ctx.ui.categorie = el.dataset.cat;
    ctx.rendre();
  },
};
