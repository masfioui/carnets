// Accueil : la liste des carnets, le bouton "Nouveau voyage" et la sauvegarde.

import { esc, dateISO, joursEntre, periode, toutesActivites, avancement, rappelsEnAttente, delai } from '../util.js';
import { icon } from '../icons.js';
import { ouvrirFeuille, toast } from '../feuille.js';

function compteARebours(debut, fin) {
  const aujourdhui = dateISO();
  if (aujourdhui < debut) {
    const n = joursEntre(aujourdhui, debut);
    return n === 1 ? 'Demain' : `Dans ${n} jours`;
  }
  if (aujourdhui <= fin) return `Jour ${joursEntre(debut, aujourdhui) + 1} sur ${joursEntre(debut, fin) + 1}`;
  return 'Terminé';
}

// Ligne d'alerte sur la carte du voyage : seulement s'il y a quelque chose à faire sous 7 jours.
function rappelUrgent(voyage, coches) {
  if (dateISO() > voyage.dates.fin) return '';
  const urgents = rappelsEnAttente(voyage, coches).filter((r) => delai(r.echeance).etat !== 'normal');
  if (!urgents.length) return '';
  const retard = urgents.some((r) => delai(r.echeance).etat === 'retard');
  return `<div class="echeance ${retard ? 'retard' : 'urgent'}" style="margin-top:8px">${icon('alert', 15)} ${urgents.length} chose${urgents.length > 1 ? 's' : ''} à faire cette semaine</div>`;
}

export function rendre(ctx) {
  const cartes = ctx.index.voyages.map((fiche) => {
    const voyage = ctx.voyages[fiche.id];
    if (!voyage) return '';
    const { faites, total } = avancement(toutesActivites(voyage), ctx.store.etat(fiche.id).coches);
    return `
      <a class="voyage" href="#/v/${esc(fiche.id)}/jours" style="--accent:${esc(fiche.accent || '#E0A458')}">
        <div class="sur-titre">${esc(fiche.pays)}</div>
        <div class="voyage-ligne">
          <h2>${esc(fiche.nom)}</h2>
          <span class="compte">${compteARebours(fiche.debut, fiche.fin)}</span>
        </div>
        <div class="doux petit">${periode(fiche.debut, fiche.fin)}</div>
        ${rappelUrgent(voyage, ctx.store.etat(fiche.id).coches)}
        <div class="voyage-pied">
          <div class="barre"><i style="width:${total ? (faites / total) * 100 : 0}%"></i></div>
          <span class="doux petit chiffres">${faites}/${total} faits</span>
        </div>
      </a>`;
  }).join('');

  return `
    <div class="accueil-tete">
      <div class="sur-titre">Mes voyages</div>
      <h1>Carnets</h1>
    </div>
    ${cartes || '<p class="vide">Aucun carnet pour l’instant.</p>'}
    <div class="actions-accueil">
      <button class="btn principal plein" data-action="nouveau">${icon('plus', 20)} Nouveau voyage</button>
      <div class="duo">
        <button class="btn" data-action="exporter">${icon('download', 20)} Sauvegarder</button>
        <button class="btn" data-action="importer">${icon('upload', 20)} Restaurer</button>
      </div>
      <input type="file" id="fichier-import" accept="application/json,.json" hidden>
    </div>
    <p class="doux petit" style="margin-top:14px;text-align:center">
      Tes cases cochées et tes dépenses restent sur ce téléphone.
    </p>`;
}

export function monter(racine, ctx) {
  racine.querySelector('#fichier-import').addEventListener('change', async (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      ctx.store.importer(await fichier.text());
      toast('Sauvegarde restaurée');
      ctx.rendre();
    } catch (erreur) {
      toast(erreur.message || 'Fichier illisible');
    }
  });
}

export const actions = {
  nouveau() {
    ouvrirFeuille(`
      <h2>Nouveau voyage</h2>
      <p style="margin-top:10px">Les carnets sont créés par Claude, pas dans l’appli. Ouvre Claude Code dans le dossier du projet et écris :</p>
      <code class="commande">/nouveau-voyage Lisbonne, du 12 au 16 mai, 2 personnes</code>
      <p>Tu peux aussi donner une vidéo YouTube de voyage :</p>
      <code class="commande">/nouveau-voyage https://youtube.com/… </code>
      <p class="doux petit">Si Claude n’arrive pas à lire la vidéo, colle sa transcription. Il n’en garde que les lieux, adresses, prix et conseils, sans raconter la vidéo.</p>
      <p class="doux petit" style="margin-top:10px">Le nouveau carnet apparaît ici après le déploiement. Ouvre l’appli deux fois avec du réseau pour le voir.</p>`);
  },

  async exporter(el, ctx) {
    const nom = `carnets-sauvegarde-${dateISO()}.json`;
    const contenu = ctx.store.exporter();
    // Sur iPhone, le plus fiable est la feuille de partage (Enregistrer dans Fichiers).
    try {
      const fichier = new File([contenu], nom, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: 'Sauvegarde Carnets' });
        return;
      }
    } catch (erreur) {
      if (erreur.name === 'AbortError') return; // partage annulé par l'utilisateur
    }
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    lien.download = nom;
    lien.click();
    URL.revokeObjectURL(lien.href);
    toast('Sauvegarde téléchargée');
  },

  importer() {
    document.getElementById('fichier-import').click();
  },
};
