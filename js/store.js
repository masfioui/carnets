// Tes données perso (cases cochées, dépenses, taux, notes) vivent dans le
// localStorage du téléphone, sous une seule clé. Le contenu des voyages, lui,
// vient des fichiers trips/*.json et n'est jamais modifié par l'appli.

const CLE = 'carnets.v1';

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) || { voyages: {} };
  } catch {
    return { voyages: {} };
  }
}

let donnees = lire();

export function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch (erreur) {
    console.warn('Sauvegarde impossible', erreur);
  }
}

// Renvoie l'état d'un voyage, en créant les champs manquants.
// Les clés de "coches" sont préfixées : "act:j2-topkapi", "plat:kunefe", "avant:papiers"…
export function etat(idVoyage) {
  const v = (donnees.voyages[idVoyage] ??= {});
  v.coches ??= {};
  v.depenses ??= [];
  v.perso ??= { avant: [], valise: [] };
  v.budget ??= null; // budget total en euros, saisi dans l'appli
  v.taux ??= null;   // dernier taux récupéré ou saisi à la main
  return v;
}

export function exporter() {
  return JSON.stringify({ app: 'carnets', version: 1, date: new Date().toISOString(), donnees }, null, 2);
}

export function importer(texte) {
  const objet = JSON.parse(texte);
  if (objet.app !== 'carnets' || !objet.donnees || !objet.donnees.voyages) {
    throw new Error('Ce fichier n’est pas une sauvegarde Carnets.');
  }
  donnees = objet.donnees;
  sauver();
}
