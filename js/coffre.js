// Le coffre : les carnets privés. Le fichier trips/coffre.json est public mais
// illisible ; il n'est déchiffré que dans le téléphone, avec un code que l'appli
// ne connaît pas d'avance. Le chiffrement est fait par tools/chiffrer.ps1.
//
// Tout passe par "crypto.subtle", l'outil de chiffrement intégré au navigateur :
//  1. PBKDF2 transforme le code en deux clés (une pour déchiffrer, une pour vérifier) ;
//  2. HMAC vérifie la signature : si elle est fausse, le code est mauvais ;
//  3. AES-CBC déchiffre le carnet et ses photos.

const CLE = 'carnets.coffre'; // le code retenu sur ce téléphone (à part de carnets.v1 : il ne part pas dans les sauvegardes)

const octets = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

export function codeEnregistre() {
  try { return localStorage.getItem(CLE) || ''; } catch { return ''; }
}

export function oublierCode() {
  try { localStorage.removeItem(CLE); } catch { /* rien à effacer */ }
}

async function dechiffrerBloc(bloc, code, tours) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const cles = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: octets(bloc.sel), iterations: tours }, base, 512));
  const iv = octets(bloc.iv);
  const donnees = octets(bloc.donnees);

  // Vérification de la signature de (iv + données). Fausse = mauvais code.
  const cleMac = await crypto.subtle.importKey('raw', cles.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signe = new Uint8Array(iv.length + donnees.length);
  signe.set(iv);
  signe.set(donnees, iv.length);
  if (!(await crypto.subtle.verify('HMAC', cleMac, octets(bloc.mac), signe))) return null;

  const cleAes = await crypto.subtle.importKey('raw', cles.slice(0, 32), 'AES-CBC', false, ['decrypt']);
  const clair = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cleAes, donnees);
  return JSON.parse(new TextDecoder().decode(clair));
}

// Renvoie la liste des carnets que ce code ouvre : [{ voyage, photos }].
// Liste vide si le code est faux ou s'il n'y a pas de coffre.
// memoriser = true : le code est retenu sur ce téléphone s'il ouvre quelque chose.
export async function ouvrirCoffre(code, memoriser = false) {
  code = (code || '').trim();
  if (!code || !globalThis.crypto?.subtle) return [];
  let coffre;
  try {
    const reponse = await fetch('trips/coffre.json');
    if (!reponse.ok) return [];
    coffre = await reponse.json();
  } catch {
    return []; // hors ligne et pas encore en cache
  }
  const ouverts = [];
  for (const bloc of coffre.blocs || []) {
    try {
      const contenu = await dechiffrerBloc(bloc, code, coffre.tours);
      if (contenu?.voyage) ouverts.push(contenu);
    } catch (erreur) {
      console.warn('Bloc du coffre illisible', erreur);
    }
  }
  if (memoriser && ouverts.length) {
    try { localStorage.setItem(CLE, code); } catch { /* stockage refusé : il faudra retaper le code */ }
  }
  return ouverts;
}
