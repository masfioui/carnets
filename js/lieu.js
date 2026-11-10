// Fiche détaillée d'un lieu, affichée dans la feuille du bas.
// Utilisée par l'écran Jours et par l'écran Lieux.

import { esc, mapsUrl, fmtDate, nombre, euros, photoLieu, etiquetteCategorie } from './util.js';
import { icon } from './icons.js';
import { ouvrirFeuille } from './feuille.js';
import { tauxCourant } from './taux.js';

export const badgeStatut = (statut) =>
  statut === 'vérifié'
    ? '<span class="badge ok">Vérifié</span>'
    : '<span class="badge averifier">À vérifier</span>';

// "2 750 TL" -> "≈ 48,83 €" (et l'inverse pour un prix en euros).
function equivalent(prix, voyage, etat) {
  if (!prix.montant) return '';
  const taux = tauxCourant(voyage, etat).valeur;
  if (prix.devise === 'EUR') return `≈ ${nombre(prix.montant * taux)} ${esc(voyage.devise.symbole)}`;
  return `≈ ${euros(prix.montant / taux)}`;
}

function ligne(nomIcone, titre, contenu) {
  return `<div class="fiche-ligne">${icon(nomIcone)}<div><div class="sur-titre">${titre}</div>${contenu}</div></div>`;
}

export function ouvrirLieu(ctx, idLieu) {
  const lieu = ctx.voyage.lieux.find((l) => l.id === idLieu);
  if (!lieu) return;
  const lignes = [];

  if (lieu.prix) {
    const p = lieu.prix;
    const eq = equivalent(p, ctx.voyage, ctx.etat);
    const lien = p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a>` : esc(p.source);
    lignes.push(ligne('tag', 'Prix', `
      <div>${esc(p.texte)} ${eq ? `<span class="doux">${eq}</span>` : ''}</div>
      <div class="source">${badgeStatut(p.statut)} le ${fmtDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${lien}</div>`));
  }
  if (lieu.horaires) {
    lignes.push(ligne('clock', 'Horaires', `<div>${esc(lieu.horaires.texte)}</div>
      ${lieu.horaires.statut === 'vérifié' ? '' : '<div class="source">' + badgeStatut(lieu.horaires.statut) + ' sur place ou sur Google Maps</div>'}`));
  }
  if (lieu.fermeture) lignes.push(ligne('alert', 'Fermeture', `<div style="color:var(--alerte)">${esc(lieu.fermeture)}</div>`));
  if (lieu.duree) lignes.push(ligne('route', 'Temps sur place', `<div>${esc(lieu.duree)}</div>`));
  if (lieu.conseil) lignes.push(ligne('bulb', 'Conseil', `<div>${esc(lieu.conseil)}</div>`));

  const photo = photoLieu(ctx.voyage, lieu);
  ouvrirFeuille(`
    ${photo ? `
      <img class="photo-tete" src="${photo}" alt="${esc(lieu.nom)}">
      <div class="credit">Photo : <a href="${esc(lieu.photo.source)}" target="_blank" rel="noopener">${esc(lieu.photo.credit)}</a>, ${esc(lieu.photo.licence)}</div>` : ''}
    <div class="sur-titre">${etiquetteCategorie(lieu.categorie)}${lieu.quartier ? ' · ' + esc(lieu.quartier) : ''}</div>
    <h2>${esc(lieu.nom)}</h2>
    <div class="fiche">${lignes.join('')}</div>
    <a class="btn principal plein" href="${mapsUrl(lieu.maps)}" target="_blank" rel="noopener">${icon('nav', 20)} Y aller</a>
    <button class="btn plein" style="margin-top:10px" data-action="chauffeur" data-lieu="${esc(lieu.id)}">${icon('taxi', 20)} Montrer au chauffeur</button>`);
}

// "Montrer au chauffeur" : le nom et l'adresse en très gros, noir sur blanc,
// à tendre à un taxi. Sans idLieu (ou pour l'hôtel) on affiche le logement avec
// son adresse complète ; pour un autre lieu, sa recherche Maps (nom local + ville).
export function ouvrirChauffeur(ctx, idLieu) {
  const { voyage } = ctx;
  const lieu = voyage.lieux.find((l) => l.id === idLieu);
  const logement = voyage.logement;
  const estLogement = !lieu || (logement && lieu.maps === logement.maps);
  if (estLogement && !logement) return;
  const nom = estLogement ? logement.nom : lieu.nom;
  const adresse = estLogement ? logement.adresse : lieu.maps;
  const phrase = logement?.phraseTaxi; // facultatif dans le JSON
  ouvrirFeuille(`
    <div class="sur-titre">À montrer au chauffeur</div>
    <div class="chauffeur" lang="${esc(voyage.langue.code)}">
      ${phrase ? `<div class="chauffeur-phrase">${esc(phrase.local)}</div>` : ''}
      <div class="chauffeur-nom">${esc(nom)}</div>
      <div class="chauffeur-adresse">${esc(adresse)}</div>
    </div>
    ${phrase ? `<p class="doux petit">« ${esc(phrase.local)} » = ${esc(phrase.fr)}</p>` : ''}
    <p class="doux petit" style="margin-top:6px">Monte la luminosité de l’écran si besoin.</p>
    <a class="btn plein" style="margin-top:14px" href="${mapsUrl(estLogement ? logement.maps : lieu.maps)}" target="_blank" rel="noopener">${icon('nav', 20)} Ouvrir dans Maps</a>`);
}
