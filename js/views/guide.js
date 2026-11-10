// Onglet Guide : phrases à écouter, plats à cocher, arnaques, urgences, infos pratiques.

import { esc, mapsUrl } from '../util.js';
import { icon } from '../icons.js';
import { toast } from '../feuille.js';
import { badgeStatut } from '../lieu.js';

const SECTIONS = [
  ['phrases', 'Phrases'],
  ['plats', 'Plats'],
  ['arnaques', 'Arnaques'],
  ['urgences', 'Urgences'],
  ['pratique', 'Pratique'],
];

function phrases(voyage) {
  const categories = [...new Set(voyage.phrases.map((p) => p.cat))];
  return categories.map((cat) => `
    <div class="section"><span class="sur-titre">${esc(cat)}</span></div>
    <div class="carte">
      ${voyage.phrases.filter((p) => p.cat === cat).map((p) => `
        <div class="phrase">
          <div class="phrase-corps">
            <div class="doux petit">${esc(p.fr)}</div>
            <div class="phrase-local" lang="${esc(voyage.langue.code)}">${esc(p.local)}</div>
            <div class="phrase-pron">${esc(p.prononciation)}</div>
          </div>
          <button class="rond" data-action="ecouter" data-texte="${esc(p.local)}" aria-label="Écouter : ${esc(p.fr)}">${icon('speaker', 20)}</button>
        </div>`).join('')}
    </div>`).join('');
}

function plats(voyage, etat) {
  const goutes = voyage.plats.filter((p) => etat.coches['plat:' + p.id]).length;
  return `
    <div class="section"><span class="sur-titre">À goûter</span><span class="doux petit chiffres">${goutes}/${voyage.plats.length}</span></div>
    <div class="carte">
      ${voyage.plats.map((p) => {
        const fait = !!etat.coches['plat:' + p.id];
        return `
          <div class="plat ${fait ? 'fait' : ''}">
            <button class="coche" data-action="cocher" data-cle="plat:${esc(p.id)}" aria-pressed="${fait}" aria-label="${esc(p.nom)} goûté"><span>${icon('check', 16)}</span></button>
            <div>
              <div class="plat-nom">${esc(p.nom)}</div>
              <div class="petit" style="color:#c3c8d0">${esc(p.description)}</div>
              ${p.ou ? `<div class="doux petit" style="margin-top:3px">${esc(p.ou)}</div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function arnaques(voyage) {
  return `<div style="margin-top:14px">${voyage.arnaques.map((a) => `
    <div class="carte arnaque">
      <h3>${esc(a.titre)}</h3>
      <p style="color:#c3c8d0">${esc(a.texte)}</p>
      <p class="parade"><b>Parade :</b> ${esc(a.parade)}</p>
    </div>`).join('')}</div>`;
}

function urgences(voyage) {
  return `<div style="margin-top:14px">${voyage.urgences.map((u) => `
    <div class="carte urgence">
      <div style="flex:1;min-width:0">
        <div><b>${esc(u.nom)}</b></div>
        ${u.numero ? `<div class="urgence-num">${esc(u.numero)}</div>` : ''}
        <div class="doux petit">${esc(u.note ?? '')}</div>
        ${u.statut === 'vérifié' ? '' : `<div style="margin-top:7px">${badgeStatut(u.statut)}</div>`}
      </div>
      ${u.numero
        ? `<a class="rond accent" href="tel:${esc(u.numero.replace(/\s/g, ''))}" aria-label="Appeler ${esc(u.nom)}">${icon('phone', 20)}</a>`
        : u.maps ? `<a class="rond" href="${mapsUrl(u.maps)}" target="_blank" rel="noopener" aria-label="Chercher sur Maps">${icon('nav', 20)}</a>` : ''}
    </div>`).join('')}</div>`;
}

function pratique(voyage) {
  const l = voyage.logement;
  return `
    <div style="margin-top:14px">
      ${l ? `
        <div class="carte urgence">
          <div style="flex:1;min-width:0">
            <div class="sur-titre">Logement</div>
            <div style="font-weight:650;font-size:17px;margin:2px 0">${esc(l.nom)}</div>
            <div class="doux petit">${esc(l.adresse)}</div>
          </div>
          <a class="rond accent" href="${mapsUrl(l.maps)}" target="_blank" rel="noopener" aria-label="Aller à l'hôtel">${icon('nav', 20)}</a>
        </div>` : ''}
      ${voyage.aSavoir.map((s) => `
        <div class="carte savoir">
          <h3>${esc(s.titre)}</h3>
          <p style="color:#c3c8d0">${esc(s.texte)}</p>
          ${s.statut === 'vérifié' ? '' : `<div style="margin-top:9px">${badgeStatut(s.statut)}</div>`}
        </div>`).join('')}
    </div>`;
}

export function rendre(ctx) {
  const { voyage, etat, ui } = ctx;
  ui.guide ??= 'phrases';
  const contenu = {
    phrases: () => phrases(voyage),
    plats: () => plats(voyage, etat),
    arnaques: () => arnaques(voyage),
    urgences: () => urgences(voyage),
    pratique: () => pratique(voyage),
  }[ui.guide]();

  return `
    <div class="puces">
      ${SECTIONS.map(([cle, nom]) => `<button class="puce ${ui.guide === cle ? 'actif' : ''}" data-action="section" data-section="${cle}">${nom}</button>`).join('')}
    </div>
    ${contenu}`;
}

// Lecture à voix haute avec la synthèse vocale du téléphone (Web Speech API).
// La voix dépend des voix installées sur l'appareil : on prévient si elle manque.
//
// Trois pièges propres à l'iPhone, gérés ici :
//  - appeler cancel() juste avant speak() fait parfois disparaître la phrase :
//    on n'annule que si une lecture est réellement en cours ;
//  - l'objet "énoncé" doit rester référencé pendant la lecture, sinon il peut
//    être effacé de la mémoire avant d'avoir parlé (d'où la variable enCours) ;
//  - le bouton silencieux du téléphone coupe aussi la synthèse vocale : si rien
//    ne démarre au bout de 1,5 s, on affiche un message pour le dire.
let enCours = null;

function parler(texte, codeLangue) {
  const synthese = window.speechSynthesis;
  if (!synthese) return toast('Lecture audio indisponible sur ce navigateur');
  if (synthese.speaking || synthese.pending) synthese.cancel();

  const enonce = new SpeechSynthesisUtterance(texte);
  enCours = enonce;
  enonce.lang = codeLangue;
  enonce.rate = 0.9;
  const voix = synthese.getVoices();
  const bonne = voix.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(codeLangue.slice(0, 2)));
  if (bonne) enonce.voice = bonne;

  let demarre = false;
  enonce.onstart = () => { demarre = true; };
  enonce.onerror = (e) => {
    demarre = true; // évite un second message
    if (e.error !== 'interrupted' && e.error !== 'canceled') toast(`Lecture impossible (${e.error})`);
  };
  synthese.resume(); // relance la synthèse si le téléphone l'avait mise en pause
  synthese.speak(enonce);

  setTimeout(() => {
    if (demarre) return;
    toast(voix.length && !bonne
      ? 'Voix absente : Réglages > Accessibilité > Contenu énoncé > Voix'
      : 'Pas de son ? Désactive le mode silencieux et monte le volume');
  }, 1500);
}
// Certains navigateurs chargent la liste des voix en différé : on la demande tôt.
if ('speechSynthesis' in window) speechSynthesis.getVoices();

export const actions = {
  section(el, ctx) {
    ctx.ui.guide = el.dataset.section;
    ctx.rendre();
    window.scrollTo(0, 0);
  },
  ecouter(el, ctx) {
    parler(el.dataset.texte, ctx.voyage.langue.code);
  },
  cocher(el, ctx) {
    const cle = el.dataset.cle;
    if (ctx.etat.coches[cle]) delete ctx.etat.coches[cle];
    else ctx.etat.coches[cle] = true;
    ctx.sauver();
    ctx.rendre();
  },
};
