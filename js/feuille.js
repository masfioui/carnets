// La "feuille" est le panneau qui monte du bas de l'écran (fiche d'un lieu,
// saisie d'un nombre…). Le toast est le petit message temporaire.

import { icon } from './icons.js';
import { esc, lireNombre } from './util.js';

const racine = () => document.getElementById('feuille');

let fermeture; // minuterie de l'animation de fermeture

export function ouvrirFeuille(html) {
  clearTimeout(fermeture); // une fermeture en cours ne doit pas effacer la nouvelle feuille
  racine().innerHTML = `
    <div class="fond" data-action="fermer-fond">
      <div class="feuille" role="dialog" aria-modal="true">
        <button class="rond feuille-x" data-action="fermer-feuille" aria-label="Fermer">${icon('close')}</button>
        ${html}
      </div>
    </div>`;
  document.body.classList.add('bloque'); // empêche la page de défiler derrière
}

// Ferme la feuille. Par défaut elle redescend (classe .sort, 0,2 s) puis on la
// retire de la page. Avec immediat = true (changement d'écran) on la retire tout de suite.
export function fermerFeuille(immediat = false) {
  document.body.classList.remove('bloque');
  clearTimeout(fermeture);
  const fond = racine().querySelector('.fond');
  if (!fond) return;
  if (immediat) {
    racine().innerHTML = '';
    return;
  }
  fond.classList.add('sort');
  fermeture = setTimeout(() => { racine().innerHTML = ''; }, 200);
}

let minuterie;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(minuterie);
  minuterie = setTimeout(() => el.classList.remove('visible'), 2800);
}

// Demande un nombre dans une feuille. Renvoie une promesse : le nombre saisi,
// ou null si la saisie est vide ou invalide.
export function demanderNombre({ titre, aide = '', valeur = '', unite = '' }) {
  return new Promise((resoudre) => {
    ouvrirFeuille(`
      <h2>${esc(titre)}</h2>
      <p class="doux petit" style="margin:8px 0 16px">${esc(aide)}</p>
      <form id="saisie-nombre">
        <div class="champ">
          <input name="n" inputmode="decimal" autocomplete="off" value="${esc(valeur)}" placeholder="0">
          <span class="unite">${esc(unite)}</span>
        </div>
        <button class="btn principal plein" style="margin-top:14px" type="submit">Enregistrer</button>
      </form>`);
    const formulaire = document.getElementById('saisie-nombre');
    formulaire.n.focus();
    formulaire.n.select();
    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = lireNombre(formulaire.n.value);
      fermerFeuille();
      resoudre(Number.isFinite(n) && n > 0 ? n : null);
    });
  });
}
