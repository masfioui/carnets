// Petites fonctions utilisées partout. Aucune ne touche à la page ni au stockage.

// Échappe un texte avant de l'insérer dans du HTML (évite qu'un "<" casse la page).
const CARACTERES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => CARACTERES[c]);

// Lien Google Maps par recherche "nom + ville" : pas de coordonnées devinées.
export const mapsUrl = (recherche) =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(recherche);

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

// Les trois moments d'une journée, dans l'ordre d'affichage.
export const MOMENTS = [['matin', 'Matin'], ['apresMidi', 'Après-midi'], ['soir', 'Soir']];

export const activitesDuJour = (jour) => MOMENTS.flatMap(([cle]) => jour[cle] ?? []);
export const toutesActivites = (voyage) => voyage.jours.flatMap(activitesDuJour);

// Compte les activités cochées (les optionnelles ne comptent pas dans le total).
export function avancement(activites, coches) {
  const comptees = activites.filter((a) => !a.optionnel);
  return { faites: comptees.filter((a) => coches['act:' + a.id]).length, total: comptees.length };
}
