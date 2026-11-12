// Taux de change : 1 euro = X unités de monnaie locale.
// Ordre de priorité : le taux enregistré sur le téléphone (récupéré en ligne ou
// saisi à la main), sinon celui écrit dans le JSON du voyage.

export function tauxCourant(voyage, etat) {
  return etat.taux ?? {
    valeur: voyage.devise.taux,
    date: voyage.devise.date,
    source: voyage.devise.source,
    manuel: false,
  };
}

// Frankfurter : API gratuite, sans clé, qui publie des taux de référence quotidiens.
export async function actualiserTaux(voyage, etat) {
  const code = voyage.devise.code;
  // Version 2 de l'API : elle connaît plus de monnaies que la version 1
  // et répond par une liste [{ date, base, quote, rate }].
  const reponse = await fetch(`https://api.frankfurter.dev/v2/rates?base=EUR&quotes=${code}`, { cache: 'no-store' });
  if (!reponse.ok) throw new Error('Réponse ' + reponse.status);
  const json = await reponse.json();
  const ligne = Array.isArray(json) ? json.find((l) => l.quote === code) : null;
  const valeur = ligne && ligne.rate;
  if (!valeur) throw new Error('Devise absente de la réponse');
  etat.taux = { valeur, date: ligne.date, source: 'Frankfurter (taux de référence)', manuel: false, recupere: Date.now() };
  return etat.taux;
}

// Faut-il retenter une mise à jour automatique ? Jamais si le taux est manuel,
// et pas plus d'une fois toutes les 6 heures.
export function tauxPerime(etat) {
  if (etat.taux && etat.taux.manuel) return false;
  const dernier = etat.taux && etat.taux.recupere;
  return !dernier || Date.now() - dernier > 6 * 3600 * 1000;
}

export const versEuros = (montant, devise, taux) => (devise === 'EUR' ? montant : montant / taux.valeur);
