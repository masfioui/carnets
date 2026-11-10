// Onglet Jours : le planning jour par jour. S'ouvre sur le jour en cours
// pendant le voyage, sinon sur le premier jour.

import { esc, dateISO, fmtDate, joursEntre, mapsUrl, prixCourt, photoLieu, rappelsEnAttente, delai, MOMENTS, activitesDuJour, toutesActivites, avancement } from '../util.js';
import { icon } from '../icons.js';

function bandeau(voyage, etat) {
  const aujourdhui = dateISO();
  const { debut, fin } = voyage.dates;
  const global = avancement(toutesActivites(voyage), etat.coches);
  let texte;
  if (aujourdhui < debut) {
    const n = joursEntre(aujourdhui, debut);
    texte = `Départ dans <b>${n} jour${n > 1 ? 's' : ''}</b>`;
  } else if (aujourdhui <= fin) {
    texte = `<b>Jour ${joursEntre(debut, aujourdhui) + 1}</b> sur ${voyage.jours.length}`;
  } else {
    texte = 'Voyage terminé';
  }
  return `<div class="bandeau"><span>${texte}</span><span class="chiffres">${global.faites}/${global.total} faits</span></div>`;
}

// Avant le départ seulement : les trois rappels les plus urgents, cochables ici.
// Une fois sur place, la carte disparaît pour laisser toute la place au planning.
function carteRappels(voyage, etat) {
  if (dateISO() >= voyage.dates.debut) return '';
  const rappels = rappelsEnAttente(voyage, etat.coches);
  if (!rappels.length) return '';
  return `
    <div class="carte rappels">
      <div class="section" style="margin:0 0 4px">
        <span class="sur-titre">À faire avant le départ</span>
        <span class="doux petit chiffres">${rappels.length} restant${rappels.length > 1 ? 's' : ''}</span>
      </div>
      ${rappels.slice(0, 3).map((r) => {
        const d = delai(r.echeance);
        return `
          <div class="item">
            <button class="coche" data-action="cocher" data-cle="avant:${esc(r.id)}" aria-pressed="false" aria-label="${esc(r.texte)}"><span>${icon('check', 16)}</span></button>
            <div class="item-corps">
              <div class="item-texte">${esc(r.texte)}</div>
              <div class="echeance ${d.etat}">${d.texte}</div>
            </div>
          </div>`;
      }).join('')}
      <button class="btn plein" style="margin-top:10px" data-action="calendrier">${icon('calendar', 20)} Me le rappeler dans mon calendrier</button>
    </div>`;
}

function carteActivite(act, voyage, etat, suivante) {
  const lieu = act.lieu ? voyage.lieux.find((l) => l.id === act.lieu) : null;
  const fait = !!etat.coches['act:' + act.id];
  const titre = act.titre ?? lieu?.nom ?? act.id;
  const duree = act.duree ?? lieu?.duree;
  const prix = prixCourt(lieu?.prix, voyage.devise.symbole);
  const meta = [
    act.heure ? `<span class="heure">${esc(act.heure)}</span>` : '',
    duree ? `<span>${esc(duree)}</span>` : '',
    prix ? `<span>${esc(prix)}</span>` : '',
  ].filter(Boolean).join('');

  return `
    ${act.trajet ? `<div class="trajet">${icon('route', 16)}<span>${esc(act.trajet)}</span></div>` : ''}
    <div class="act ${fait ? 'fait' : ''} ${suivante ? 'suivante' : ''}">
      <button class="coche" data-action="cocher" data-id="${esc(act.id)}" aria-pressed="${fait}" aria-label="Marquer ${esc(titre)} comme fait">
        <span>${icon('check', 16)}</span>
      </button>
      <div class="act-corps" ${lieu ? `data-action="lieu" data-lieu="${esc(lieu.id)}" role="button"` : ''}>
        ${suivante ? '<div class="etiquette">Prochaine étape</div>' : ''}
        ${act.optionnel ? '<div class="etiquette" style="color:var(--doux)">Optionnel</div>' : ''}
        <div class="act-titre">${esc(titre)}</div>
        ${meta ? `<div class="act-meta">${meta}</div>` : ''}
        ${act.note ? `<div class="act-note">${esc(act.note)}</div>` : ''}
      </div>
      ${lieu ? `<a class="rond accent" href="${mapsUrl(lieu.maps)}" target="_blank" rel="noopener" aria-label="Y aller : ${esc(lieu.nom)}">${icon('nav', 20)}</a>` : ''}
    </div>`;
}

export function rendre(ctx) {
  const { voyage, etat, ui } = ctx;
  const aujourdhui = dateISO();
  ui.jour ??= (voyage.jours.find((j) => j.date === aujourdhui) ?? voyage.jours[0]).date;
  const jour = voyage.jours.find((j) => j.date === ui.jour) ?? voyage.jours[0];

  const selecteur = voyage.jours.map((j) => {
    const a = avancement(activitesDuJour(j), etat.coches);
    const classes = [
      'jour-btn',
      j.date === jour.date ? 'actif' : '',
      j.date === aujourdhui ? 'aujourdhui' : '',
      a.total && a.faites === a.total ? 'complet' : '',
    ].join(' ');
    return `
      <button class="${classes}" data-action="jour" data-date="${j.date}" aria-label="${fmtDate(j.date, { weekday: 'long', day: 'numeric', month: 'long' })}">
        <small>${fmtDate(j.date, { weekday: 'short' }).replace('.', '')}</small>
        <b>${fmtDate(j.date, { day: 'numeric' })}</b>
      </button>`;
  }).join('');

  // Photo du jour : le lieu désigné par "couverture" dans le JSON, sinon le
  // premier lieu de la journée qui a une photo.
  const lieuxDuJour = activitesDuJour(jour).map((a) => voyage.lieux.find((l) => l.id === a.lieu));
  const lieuCouverture = voyage.lieux.find((l) => l.id === jour.couverture) ?? lieuxDuJour.find((l) => l?.photo);
  const couverture = photoLieu(voyage, lieuCouverture);

  const duJour = avancement(activitesDuJour(jour), etat.coches);
  // La "prochaine étape" est la première activité non cochée et non optionnelle du jour.
  const prochaine = activitesDuJour(jour).find((a) => !a.optionnel && !etat.coches['act:' + a.id]);

  const moments = MOMENTS.map(([cle, nom]) => {
    const liste = jour[cle] ?? [];
    return `
      <div class="section"><span class="sur-titre">${nom}</span></div>
      ${liste.length
        ? liste.map((a) => carteActivite(a, voyage, etat, a === prochaine)).join('')
        : '<p class="vide">Rien de prévu.</p>'}`;
  }).join('');

  return `
    ${bandeau(voyage, etat)}
    ${carteRappels(voyage, etat)}
    <div class="jours">${selecteur}</div>
    <div class="jour-tete">
      ${couverture ? `
        <div class="jour-photo">
          <img src="${couverture}" alt="">
          <div class="jour-photo-texte">
            <div class="sur-titre">${fmtDate(jour.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h2>${esc(jour.titre)}</h2>
          </div>
        </div>` : `
        <div class="sur-titre">${fmtDate(jour.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <h2>${esc(jour.titre)}</h2>`}
      <p class="doux">${esc(jour.resume ?? '')}</p>
      <div class="jour-avance">
        <div class="barre"><i style="width:${duJour.total ? (duJour.faites / duJour.total) * 100 : 0}%"></i></div>
        <span class="doux petit chiffres">${duJour.faites}/${duJour.total}</span>
      </div>
    </div>
    ${jour.alertes?.length ? `<div class="alertes">${jour.alertes.map((a) => `<div class="alerte">${icon('alert', 18)}<span>${esc(a)}</span></div>`).join('')}</div>` : ''}
    ${moments}
    ${jour.planB ? `
      <div class="carte planb">${icon('umbrella')}
        <div><div class="sur-titre">Plan B</div><p style="margin-top:4px">${esc(jour.planB)}</p></div>
      </div>` : ''}`;
}

export const actions = {
  jour(el, ctx) {
    ctx.ui.jour = el.dataset.date;
    ctx.rendre(true); // true = avec l'animation d'entrée
    window.scrollTo(0, 0);
  },
  cocher(el, ctx) {
    // Une activité porte data-id, un rappel porte directement sa clé complète (data-cle).
    const cle = el.dataset.cle ?? 'act:' + el.dataset.id;
    if (ctx.etat.coches[cle]) delete ctx.etat.coches[cle];
    else ctx.etat.coches[cle] = true;
    ctx.sauver();
    ctx.rendre();
  },
};
