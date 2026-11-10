// Onglet Budget : convertisseur de devises en haut, suivi des dépenses en dessous.
// Chaque dépense garde son montant d'origine ET sa valeur en euros au taux du
// jour de la saisie : changer le taux plus tard ne modifie pas les anciennes dépenses.

import { esc, fmtDate, lireNombre, nombre, euros, dateISO } from '../util.js';
import { icon } from '../icons.js';
import { toast, demanderNombre } from '../feuille.js';
import { tauxCourant, actualiserTaux, versEuros } from '../taux.js';

const REPERES = [100, 500, 1000];

export function rendre(ctx) {
  const { voyage, etat, ui } = ctx;
  const d = voyage.devise;
  const taux = tauxCourant(voyage, etat);
  ui.saisie ??= { devise: d.code, categorie: voyage.budget.categories[0] };

  const depense = etat.depenses.reduce((somme, x) => somme + x.eur, 0);
  const prevu = etat.budget ?? voyage.budget.prevu;
  const reste = prevu ? prevu - depense : null;
  const part = prevu ? Math.min(100, (depense / prevu) * 100) : 0;

  const parCategorie = voyage.budget.categories
    .map((cat) => [cat, etat.depenses.filter((x) => x.cat === cat).reduce((s, x) => s + x.eur, 0)])
    .filter(([, total]) => total > 0);

  return `
    <div class="carte">
      <div class="sur-titre" style="margin-bottom:10px">Convertisseur</div>
      <div class="champ">
        <label for="conv-local">${esc(d.code)}</label>
        <input id="conv-local" inputmode="decimal" autocomplete="off" placeholder="0">
      </div>
      <div class="champ">
        <label for="conv-eur">EUR</label>
        <input id="conv-eur" inputmode="decimal" autocomplete="off" placeholder="0">
      </div>
      <div class="reperes">
        ${REPERES.map((n) => `
          <button class="repere" data-action="repere" data-montant="${n}">
            <b class="chiffres">${nombre(n)} ${esc(d.symbole)}</b><span class="chiffres">${euros(n / taux.valeur)}</span>
          </button>`).join('')}
      </div>
      <div class="taux">
        <div>
          <div class="chiffres"><b>1 € = ${nombre(taux.valeur, 2)} ${esc(d.symbole)}</b></div>
          <div class="doux petit">${taux.manuel ? 'Saisi à la main' : esc(taux.source)} · ${fmtDate(taux.date, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <div class="taux-actions">
          <button class="rond" data-action="taux-actualiser" aria-label="Actualiser le taux">${icon('refresh', 20)}</button>
          <button class="rond" data-action="taux-modifier" aria-label="Modifier le taux à la main">${icon('edit', 20)}</button>
        </div>
      </div>
    </div>

    <div class="section"><span class="sur-titre">Budget</span></div>
    <div class="carte">
      <div class="totaux">
        <button class="total" data-action="budget-modifier" aria-label="Modifier le budget prévu">
          <span class="doux petit">Prévu</span>
          <b>${prevu ? euros(prevu) : 'Définir'}</b>
        </button>
        <div class="total"><span class="doux petit">Dépensé</span><b>${euros(depense)}</b></div>
        <div class="total reste ${reste !== null && reste < 0 ? 'negatif' : ''}">
          <span class="doux petit">Reste</span><b>${reste === null ? '–' : euros(reste)}</b>
        </div>
      </div>
      <div class="barre ${reste !== null && reste < 0 ? 'rouge' : ''}"><i style="width:${part}%"></i></div>
      ${prevu ? '' : '<p class="doux petit" style="margin-top:10px">Appuie sur « Définir » pour fixer ton budget en euros.</p>'}
    </div>

    <form class="carte" id="form-depense">
      <div class="sur-titre" style="margin-bottom:10px">Ajouter une dépense</div>
      <div class="ligne-saisie">
        <div class="champ"><input name="montant" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Montant"></div>
        <div class="bascule" role="group" aria-label="Devise">
          <button type="button" class="${ui.saisie.devise === d.code ? 'actif' : ''}" data-action="devise" data-devise="${esc(d.code)}">${esc(d.symbole)}</button>
          <button type="button" class="${ui.saisie.devise === 'EUR' ? 'actif' : ''}" data-action="devise" data-devise="EUR">€</button>
        </div>
      </div>
      <div class="cats">
        ${voyage.budget.categories.map((cat) => `
          <button type="button" class="puce ${ui.saisie.categorie === cat ? 'actif' : ''}" data-action="categorie" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('')}
      </div>
      <div class="champ" style="min-height:52px"><input class="texte" name="note" autocomplete="off" placeholder="Note (facultatif)" aria-label="Note"></div>
      <button class="btn principal plein" style="margin-top:12px" type="submit">${icon('plus', 20)} Ajouter</button>
    </form>

    ${parCategorie.length ? `
      <div class="section"><span class="sur-titre">Par catégorie</span></div>
      <div class="carte par-cat">
        ${parCategorie.map(([cat, total]) => `
          <div>
            <div class="par-cat-ligne"><span>${esc(cat)}</span><b class="chiffres">${euros(total)}</b></div>
            <div class="barre"><i style="width:${(total / depense) * 100}%"></i></div>
          </div>`).join('')}
      </div>` : ''}

    <div class="section"><span class="sur-titre">Dépenses</span><span class="doux petit">${etat.depenses.length}</span></div>
    ${etat.depenses.length ? `
      <div class="carte" style="padding-top:6px;padding-bottom:6px">
        ${[...etat.depenses].reverse().map((x) => `
          <div class="depense">
            <div class="depense-corps">
              <div><b>${esc(x.cat)}</b>${x.note ? ` · ${esc(x.note)}` : ''}</div>
              <div class="doux petit">${fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            </div>
            <div class="depense-montant">
              <div>${euros(x.eur)}</div>
              ${x.devise !== 'EUR' ? `<div class="doux petit">${nombre(x.montant, 2)} ${esc(d.symbole)}</div>` : ''}
            </div>
            <button class="rond" data-action="supprimer" data-id="${esc(x.id)}" aria-label="Supprimer cette dépense">${icon('trash', 18)}</button>
          </div>`).join('')}
      </div>` : '<p class="vide">Aucune dépense enregistrée.</p>'}`;
}

export function monter(racine, ctx) {
  const local = racine.querySelector('#conv-local');
  const eur = racine.querySelector('#conv-eur');
  const taux = () => tauxCourant(ctx.voyage, ctx.etat).valeur;
  const ecrire = (champ, n) => { champ.value = Number.isFinite(n) ? nombre(n, 2) : ''; };

  // Taper dans un champ met l'autre à jour, sans redessiner l'écran.
  local.addEventListener('input', () => ecrire(eur, lireNombre(local.value) / taux()));
  eur.addEventListener('input', () => ecrire(local, lireNombre(eur.value) * taux()));

  racine.querySelector('#form-depense').addEventListener('submit', (e) => {
    e.preventDefault();
    const formulaire = e.target;
    const montant = lireNombre(formulaire.montant.value);
    if (!Number.isFinite(montant) || montant <= 0) return toast('Saisis un montant');
    const { devise, categorie } = ctx.ui.saisie;
    ctx.etat.depenses.push({
      id: Date.now().toString(36),
      montant,
      devise,
      eur: versEuros(montant, devise, tauxCourant(ctx.voyage, ctx.etat)),
      cat: categorie,
      note: formulaire.note.value.trim(),
      date: dateISO(),
    });
    ctx.sauver();
    ctx.rendre();
    toast('Dépense ajoutée');
  });
}

// Active un bouton parmi ses voisins sans redessiner (le montant tapé reste en place).
function activer(el) {
  [...el.parentElement.children].forEach((frere) => frere.classList.toggle('actif', frere === el));
}

export const actions = {
  devise(el, ctx) { ctx.ui.saisie.devise = el.dataset.devise; activer(el); },
  categorie(el, ctx) { ctx.ui.saisie.categorie = el.dataset.cat; activer(el); },

  repere(el) {
    const champ = document.getElementById('conv-local');
    champ.value = el.dataset.montant;
    champ.dispatchEvent(new Event('input'));
  },

  async 'taux-actualiser'(el, ctx) {
    try {
      const t = await actualiserTaux(ctx.voyage, ctx.etat);
      ctx.sauver();
      ctx.rendre();
      toast(`Taux du ${fmtDate(t.date, { day: 'numeric', month: 'long' })}`);
    } catch {
      toast('Pas de réseau : dernier taux connu conservé');
    }
  },

  async 'taux-modifier'(el, ctx) {
    const d = ctx.voyage.devise;
    const n = await demanderNombre({
      titre: 'Taux à la main',
      aide: `Combien de ${d.nom}s pour 1 euro ? Utile pour coller au taux réel de ton bureau de change.`,
      valeur: nombre(tauxCourant(ctx.voyage, ctx.etat).valeur, 2),
      unite: d.symbole,
    });
    if (!n) return;
    ctx.etat.taux = { valeur: n, date: dateISO(), source: 'Saisi à la main', manuel: true };
    ctx.sauver();
    ctx.rendre();
  },

  async 'budget-modifier'(el, ctx) {
    const n = await demanderNombre({
      titre: 'Budget prévu',
      aide: 'Ton budget total sur place, en euros (hors vols et hôtel).',
      valeur: ctx.etat.budget ? String(ctx.etat.budget) : '',
      unite: '€',
    });
    if (!n) return;
    ctx.etat.budget = n;
    ctx.sauver();
    ctx.rendre();
  },

  supprimer(el, ctx) {
    ctx.etat.depenses = ctx.etat.depenses.filter((x) => x.id !== el.dataset.id);
    ctx.sauver();
    ctx.rendre();
  },
};
