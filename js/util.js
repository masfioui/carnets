// Petites fonctions utilisées partout. Aucune ne touche à la page ni au stockage.

import { icon } from './icons.js';

// Échappe un texte avant de l'insérer dans du HTML (évite qu'un "<" casse la page).
const CARACTERES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => CARACTERES[c]);

// Lien Google Maps par recherche "nom + ville" : pas de coordonnées devinées.
export const mapsUrl = (recherche) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(recherche);

// Adresse de la photo d'un lieu. Convention : un lieu qui a un champ "photo"
// dans le JSON a son image dans images/<voyage>/<lieu>.jpg. Renvoie '' sinon.
export const photoLieu = (voyage, lieu) => (lieu && lieu.photo ? `images/${voyage.id}/${lieu.id}.jpg` : '');

// Dates au format "2027-01-17", toujours en heure locale du téléphone.
export function dateISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function lireDate(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j);
}
export const joursEntre = (debut, fin) => Math.round((lireDate(fin) - lireDate(debut)) / 86400000);
export const fmtDate = (iso, options) => new Intl.DateTimeFormat('fr-FR', options).format(lireDate(iso));

export function periode(debut, fin) {
  const a = fmtDate(debut, { day: 'numeric', month: 'short' });
  const b = fmtDate(fin, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

// "1 234,5" ou "1234.5" tapé au clavier -> nombre.
export const lireNombre = (texte) => parseFloat(String(texte).replace(/\s/g, '').replace(',', '.'));

export function nombre(n, decimales = 0) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}
export const euros = (n) => nombre(n, Math.abs(n) < 100 ? 2 : 0) + ' €';

// Prix en version courte pour les listes : "Gratuit", "25 €", "~2 650 ₺".
// Le "~" signale un prix marqué "à vérifier". Renvoie '' si le montant est inconnu.
export function prixCourt(prix, symboleLocal) {
  if (!prix || prix.montant === null || prix.montant === undefined) return '';
  if (prix.montant === 0) return 'Gratuit';
  const approx = prix.statut === 'vérifié' ? '' : '~';
  return approx + (prix.devise === 'EUR' ? euros(prix.montant) : `${nombre(prix.montant)} ${symboleLocal}`);
}

// Rappels : les éléments de la check-list "avant" qui ont une date limite
// ("echeance") et ne sont pas encore cochés, du plus urgent au moins urgent.
export function rappelsEnAttente(voyage, coches) {
  return (voyage.checklist?.avant ?? [])
    .filter((i) => i.echeance && !coches['avant:' + i.id])
    .sort((a, b) => a.echeance.localeCompare(b.echeance));
}

// Texte et niveau d'urgence d'une date limite : "retard", "urgent" (7 jours ou moins) ou "normal".
export function delai(echeance) {
  const n = joursEntre(dateISO(), echeance);
  if (n < 0) return { texte: `En retard de ${-n} j`, etat: 'retard' };
  if (n === 0) return { texte: 'À faire aujourd’hui', etat: 'urgent' };
  if (n <= 7) return { texte: `Dans ${n} jour${n > 1 ? 's' : ''}`, etat: 'urgent' };
  return { texte: `Avant le ${fmtDate(echeance, { day: 'numeric', month: 'short' })}`, etat: 'normal' };
}

// Nom affiché de chaque type de lieu. La couleur associée est dans css/style.css (.cat-visite, etc.).
export const NOMS_CATEGORIES = { visite: 'Visite', manger: 'Manger', balade: 'Balade', shopping: 'Shopping', option: 'Option', pratique: 'Pratique' };

// Petite étiquette colorée : un point + le nom du type de lieu.
export const etiquetteCategorie = (categorie) =>
  NOMS_CATEGORIES[categorie] ? `<span class="cat cat-${categorie}">${NOMS_CATEGORIES[categorie]}</span>` : '';

// Case à cocher ronde. cle = clé complète ("avant:passeport") ou id = id d'activité.
// Sur iPhone, Safari n'a pas de fonction de vibration. Seule chose qui vibre encore
// (depuis iOS 26.5) : un vrai interrupteur natif <input type="checkbox" switch> touché
// par le doigt. On en pose donc un, invisible, par-dessus la case : c'est lui qui
// reçoit le toucher et produit le petit "tic". Le clic remonte ensuite au <label>,
// qui porte data-action="cocher".
export function coche({ cle, id, fait, label }) {
  const cible = cle ? `data-cle="${esc(cle)}"` : `data-id="${esc(id)}"`;
  return `<label class="coche" data-action="cocher" ${cible} aria-pressed="${!!fait}">
    <input class="haptique" type="checkbox" switch ${fait ? 'checked' : ''} aria-label="${esc(label)}">
    <span>${icon('check', 16)}</span>
  </label>`;
}

// Les trois moments d'une journée, dans l'ordre d'affichage.
export const MOMENTS = [['matin', 'Matin'], ['apresMidi', 'Après-midi'], ['soir', 'Soir']];

export const activitesDuJour = (jour) => MOMENTS.flatMap(([cle]) => jour[cle] ?? []);
export const toutesActivites = (voyage) => voyage.jours.flatMap(activitesDuJour);

// Compte les activités cochées (les optionnelles ne comptent pas dans le total).
export function avancement(activites, coches) {
  const comptees = activites.filter((a) => !a.optionnel);
  return { faites: comptees.filter((a) => coches['act:' + a.id]).length, total: comptees.length };
}
