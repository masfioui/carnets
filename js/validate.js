// Validateur du schéma d'un carnet. Sert de garde-fou au "générateur" (Claude) :
// un voyage qui ne passe pas ici ne doit pas être déployé.
// validerVoyage(voyage, ficheIndex) renvoie { erreurs: [...], avertissements: [...] }.

const STATUTS = ['vérifié', 'à vérifier'];
const CATEGORIES = ['visite', 'manger', 'balade', 'shopping', 'option', 'pratique'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOMENTS = ['matin', 'apresMidi', 'soir'];

export function validerVoyage(v, fiche) {
  const erreurs = [];
  const avertissements = [];
  const exiger = (condition, message) => { if (!condition) erreurs.push(message); };
  const texte = (x) => typeof x === 'string' && x.trim() !== '';
  const uniques = (liste, nom) => {
    const vus = new Set();
    for (const id of liste) {
      exiger(texte(id), `${nom} : un id est manquant`);
      exiger(!vus.has(id), `${nom} : id en double « ${id} »`);
      vus.add(id);
    }
    return vus;
  };

  // --- En-tête ---
  exiger(v.schema === 1, 'schema doit valoir 1');
  for (const champ of ['id', 'nom', 'pays', 'ville', 'accent', 'majLe']) exiger(texte(v[champ]), `champ « ${champ} » manquant`);
  exiger(/^#[0-9a-fA-F]{6}$/.test(v.accent ?? ''), 'accent doit être une couleur du type #E0A458');
  exiger(DATE.test(v.dates?.debut ?? '') && DATE.test(v.dates?.fin ?? ''), 'dates.debut et dates.fin au format AAAA-MM-JJ');
  exiger((v.dates?.debut ?? '') <= (v.dates?.fin ?? ''), 'dates.debut doit précéder dates.fin');
  exiger(DATE.test(v.majLe ?? ''), 'majLe au format AAAA-MM-JJ');

  const d = v.devise ?? {};
  exiger(/^[A-Z]{3}$/.test(d.code ?? ''), 'devise.code : 3 lettres (ex. TRY)');
  exiger(texte(d.symbole) && texte(d.nom), 'devise.symbole et devise.nom requis');
  exiger(typeof d.taux === 'number' && d.taux > 0, 'devise.taux : nombre positif (unités locales pour 1 euro)');
  exiger(DATE.test(d.date ?? '') && texte(d.source), 'devise.date et devise.source requis');
  exiger(/^[a-z]{2}-[A-Z]{2}$/.test(v.langue?.code ?? ''), 'langue.code du type tr-TR');

  // logement.phraseTaxi (facultatif) : la phrase affichée par "Montrer au chauffeur".
  if (v.logement?.phraseTaxi !== undefined) {
    exiger(texte(v.logement.phraseTaxi.local) && texte(v.logement.phraseTaxi.fr), 'logement.phraseTaxi : local et fr requis');
  }

  // villes (facultatif) : les autres villes d'un voyage à étapes (ex. Lisbonne puis Porto).
  // La recherche maps d'un lieu doit alors contenir « ville » ou l'une de ces « villes ».
  if (v.villes !== undefined) {
    exiger(Array.isArray(v.villes) && v.villes.every(texte), 'villes : liste de noms de villes (facultatif)');
  }
  const villesAdmises = [v.ville, ...(Array.isArray(v.villes) ? v.villes : [])].filter(texte).map((x) => x.toLowerCase());

  // --- Lieux ---
  exiger(Array.isArray(v.lieux) && v.lieux.length > 0, 'lieux : liste vide');
  const idsLieux = uniques((v.lieux ?? []).map((l) => l.id), 'lieux');
  for (const l of v.lieux ?? []) {
    const ou = `lieu « ${l.id} »`;
    exiger(texte(l.nom), `${ou} : nom manquant`);
    exiger(CATEGORIES.includes(l.categorie), `${ou} : catégorie inconnue « ${l.categorie} »`);
    exiger(texte(l.maps), `${ou} : champ maps manquant (recherche « nom, ville »)`);
    if (texte(l.maps) && villesAdmises.length && !villesAdmises.some((ville) => l.maps.toLowerCase().includes(ville))) {
      avertissements.push(`${ou} : la recherche maps ne contient aucune des villes du voyage (${[v.ville, ...(v.villes ?? [])].join(', ')})`);
    }
    exiger(!('lat' in l) && !('lng' in l) && !('coords' in l), `${ou} : pas de coordonnées, seulement une recherche par nom`);
    if (l.prix) {
      const p = l.prix;
      exiger(texte(p.texte), `${ou} : prix.texte manquant`);
      exiger(p.montant === null || typeof p.montant === 'number', `${ou} : prix.montant doit être un nombre ou null`);
      exiger(/^[A-Z]{3}$/.test(p.devise ?? ''), `${ou} : prix.devise manquante`);
      exiger(DATE.test(p.date ?? ''), `${ou} : prix.date manquante (date de vérification)`);
      exiger(texte(p.source), `${ou} : prix.source manquante`);
      exiger(STATUTS.includes(p.statut), `${ou} : prix.statut doit être « vérifié » ou « à vérifier »`);
      if (p.montant === null && p.statut === 'vérifié') erreurs.push(`${ou} : un prix inconnu ne peut pas être « vérifié »`);
      if (p.statut === 'à vérifier') avertissements.push(`${ou} : prix à vérifier`);
    } else if (l.categorie !== 'pratique') {
      avertissements.push(`${ou} : aucun prix renseigné`);
    }
    if (l.photo) {
      // Le fichier images/<voyage>/<lieu>.jpg doit exister (vérifié par tools/validate.html).
      exiger(texte(l.photo.credit) && texte(l.photo.licence) && /^https:\/\//.test(l.photo.source ?? ''), `${ou} : photo sans crédit, licence ou source`);
    }
    if (l.horaires) {
      exiger(texte(l.horaires.texte), `${ou} : horaires.texte manquant`);
      exiger(STATUTS.includes(l.horaires.statut), `${ou} : horaires.statut invalide`);
      if (l.horaires.statut === 'à vérifier') avertissements.push(`${ou} : horaires à vérifier`);
    }
  }

  if (v.couverture !== undefined) {
    exiger((v.lieux ?? []).some((l) => l.id === v.couverture && l.photo), `couverture « ${v.couverture} » : doit être l'id d'un lieu qui a une photo`);
  }

  // --- Jours ---
  exiger(Array.isArray(v.jours) && v.jours.length > 0, 'jours : liste vide');
  const idsActivites = [];
  const utilises = new Set();
  let precedent = '';
  for (const j of v.jours ?? []) {
    const ou = `jour ${j.date}`;
    exiger(DATE.test(j.date ?? ''), `${ou} : date invalide`);
    exiger(j.date > precedent, `${ou} : les jours doivent être dans l'ordre et sans doublon`);
    exiger(j.date >= v.dates?.debut && j.date <= v.dates?.fin, `${ou} : hors des dates du voyage`);
    exiger(texte(j.titre), `${ou} : titre manquant`);
    precedent = j.date;
    for (const moment of MOMENTS) {
      exiger(Array.isArray(j[moment]), `${ou} : « ${moment} » doit être une liste (vide si rien)`);
      for (const a of j[moment] ?? []) {
        idsActivites.push(a.id);
        exiger(texte(a.lieu) || texte(a.titre), `${ou} : l'activité « ${a.id} » n'a ni lieu ni titre`);
        if (a.lieu) {
          exiger(idsLieux.has(a.lieu), `${ou} : l'activité « ${a.id} » pointe vers un lieu inconnu « ${a.lieu} »`);
          utilises.add(a.lieu);
        }
      }
    }
  }
  uniques(idsActivites, 'activités');
  for (const l of v.lieux ?? []) {
    if (!utilises.has(l.id) && l.categorie !== 'option') avertissements.push(`lieu « ${l.id} » : jamais utilisé dans le planning`);
  }

  // --- Guide ---
  exiger(Array.isArray(v.phrases) && v.phrases.length >= 10, 'phrases : au moins 10');
  for (const p of v.phrases ?? []) exiger(texte(p.cat) && texte(p.fr) && texte(p.local) && texte(p.prononciation), `phrase « ${p.fr} » incomplète`);
  exiger(Array.isArray(v.plats) && v.plats.length >= 5, 'plats : au moins 5');
  uniques((v.plats ?? []).map((p) => p.id), 'plats');
  for (const p of v.plats ?? []) exiger(texte(p.nom) && texte(p.description), `plat « ${p.id} » incomplet`);
  exiger(Array.isArray(v.arnaques) && v.arnaques.length > 0, 'arnaques : liste vide');
  for (const a of v.arnaques ?? []) exiger(texte(a.titre) && texte(a.texte) && texte(a.parade), `arnaque « ${a.titre} » incomplète`);
  exiger(Array.isArray(v.urgences) && v.urgences.some((u) => texte(u.numero)), 'urgences : au moins un numéro');
  for (const u of v.urgences ?? []) {
    exiger(texte(u.nom) && STATUTS.includes(u.statut) && texte(u.source), `urgence « ${u.nom} » : nom, source et statut requis`);
    exiger(u.numero === null || texte(u.numero), `urgence « ${u.nom} » : numero doit être un texte ou null`);
  }
  for (const s of v.aSavoir ?? []) {
    exiger(texte(s.titre) && texte(s.texte) && texte(s.source) && STATUTS.includes(s.statut), `aSavoir « ${s.titre} » : titre, texte, source et statut requis`);
  }

  // --- Listes et budget ---
  for (const cle of ['avant', 'valise']) {
    const liste = v.checklist?.[cle];
    exiger(Array.isArray(liste) && liste.length > 0, `checklist.${cle} : liste vide`);
    uniques((liste ?? []).map((i) => i.id), `checklist.${cle}`);
    for (const i of liste ?? []) {
      exiger(texte(i.texte), `checklist.${cle} « ${i.id} » : texte manquant`);
      // echeance (facultatif) = date limite, qui devient un rappel dans l'appli et le calendrier.
      if (i.echeance !== undefined) {
        exiger(DATE.test(i.echeance), `checklist.${cle} « ${i.id} » : echeance au format AAAA-MM-JJ`);
        exiger(i.echeance <= (v.dates?.debut ?? ''), `checklist.${cle} « ${i.id} » : echeance après le départ`);
      }
    }
    if (cle === 'avant' && !(liste ?? []).some((i) => i.echeance)) avertissements.push('checklist.avant : aucune echeance, donc aucun rappel');
  }
  exiger(Array.isArray(v.budget?.categories) && v.budget.categories.length > 0, 'budget.categories : liste vide');

  // --- Cohérence avec trips/index.json ---
  if (fiche) {
    exiger(fiche.id === v.id, `index : id « ${fiche.id} » différent de celui du fichier « ${v.id} »`);
    exiger(fiche.debut === v.dates?.debut && fiche.fin === v.dates?.fin, 'index : dates différentes de celles du fichier');
    exiger(fiche.nom === v.nom && fiche.pays === v.pays, 'index : nom ou pays différent de celui du fichier');
  }

  return { erreurs, avertissements };
}
