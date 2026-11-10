// Onglet Listes : check-list avant le départ et valise.
// Les éléments du JSON sont fixes ; tu peux ajouter les tiens (stockés sur le téléphone).

import { esc } from '../util.js';
import { icon } from '../icons.js';

const LISTES = [['avant', 'Avant le départ'], ['valise', 'Valise']];

function liste(cle, titre, voyage, etat) {
  const fixes = voyage.checklist[cle] ?? [];
  const perso = etat.perso[cle] ?? [];
  const tous = [...fixes, ...perso.map((p) => ({ ...p, perso: true }))];
  const faits = tous.filter((i) => etat.coches[`${cle}:${i.id}`]).length;

  return `
    <div class="section"><span class="sur-titre">${titre}</span><span class="doux petit chiffres">${faits}/${tous.length}</span></div>
    <div class="carte">
      <div class="barre" style="margin-bottom:10px"><i style="width:${tous.length ? (faits / tous.length) * 100 : 0}%"></i></div>
      ${tous.map((i) => {
        const fait = !!etat.coches[`${cle}:${i.id}`];
        return `
          <div class="item ${fait ? 'fait' : ''}">
            <button class="coche" data-action="cocher" data-cle="${cle}:${esc(i.id)}" aria-pressed="${fait}" aria-label="${esc(i.texte)}"><span>${icon('check', 16)}</span></button>
            <div class="item-corps">
              <div class="item-texte">${esc(i.texte)}</div>
              ${i.note ? `<div class="doux petit">${esc(i.note)}</div>` : ''}
            </div>
            ${i.perso ? `<button class="rond" style="margin:-8px 0" data-action="retirer" data-liste="${cle}" data-id="${esc(i.id)}" aria-label="Retirer ${esc(i.texte)}">${icon('trash', 18)}</button>` : ''}
          </div>`;
      }).join('')}
      <form class="ajout" data-liste="${cle}">
        <div class="champ"><input class="texte" name="texte" autocomplete="off" placeholder="Ajouter un élément" aria-label="Ajouter à ${titre}"></div>
        <button class="rond" style="width:48px;height:48px" type="submit" aria-label="Ajouter">${icon('plus', 20)}</button>
      </form>
    </div>`;
}

export function rendre(ctx) {
  return LISTES.map(([cle, titre]) => liste(cle, titre, ctx.voyage, ctx.etat)).join('');
}

export function monter(racine, ctx) {
  racine.querySelectorAll('form.ajout').forEach((formulaire) => {
    formulaire.addEventListener('submit', (e) => {
      e.preventDefault();
      const texte = formulaire.texte.value.trim();
      if (!texte) return;
      ctx.etat.perso[formulaire.dataset.liste].push({ id: 'perso-' + Date.now().toString(36), texte });
      ctx.sauver();
      ctx.rendre();
    });
  });
}

export const actions = {
  cocher(el, ctx) {
    const cle = el.dataset.cle;
    if (ctx.etat.coches[cle]) delete ctx.etat.coches[cle];
    else ctx.etat.coches[cle] = true;
    ctx.sauver();
    ctx.rendre();
  },
  retirer(el, ctx) {
    const { liste: cle, id } = el.dataset;
    ctx.etat.perso[cle] = ctx.etat.perso[cle].filter((i) => i.id !== id);
    delete ctx.etat.coches[`${cle}:${id}`];
    ctx.sauver();
    ctx.rendre();
  },
};
