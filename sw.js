// Service worker : un petit programme que le navigateur garde en mémoire et qui
// intercepte les requêtes de l'appli. Il range les fichiers dans un cache pour
// que tout fonctionne sans réseau.
//
// Stratégie "cache d'abord, mise à jour en arrière-plan" :
//  - si le fichier est en cache, on le sert tout de suite (ouverture instantanée) ;
//  - en parallèle on télécharge la version récente pour la PROCHAINE ouverture.
// Conséquence : après un déploiement, il faut ouvrir l'appli deux fois pour voir la nouveauté.
//
// Change ce numéro quand la liste SOCLE ci-dessous change.
const CACHE = 'carnets-v3';

const SOCLE = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/app.js',
  'js/util.js',
  'js/store.js',
  'js/icons.js',
  'js/feuille.js',
  'js/taux.js',
  'js/lieu.js',
  'js/calendrier.js',
  'js/views/accueil.js',
  'js/views/jours.js',
  'js/views/lieux.js',
  'js/views/budget.js',
  'js/views/guide.js',
  'js/views/listes.js',
  'trips/index.json',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

// Installation : on télécharge le socle, puis tous les carnets listés dans
// trips/index.json. Ainsi une seule ouverture avec du réseau suffit pour que
// tout soit disponible hors ligne.
async function toutMettreEnCache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SOCLE);
  const index = await (await fetch('trips/index.json')).json();
  await cache.addAll(index.voyages.map((fiche) => 'trips/' + fiche.fichier));

  // Les photos : on lit chaque carnet pour savoir quels lieux en ont une.
  // Une photo qui échoue ne doit pas empêcher l'installation, d'où le catch.
  for (const fiche of index.voyages) {
    const voyage = await (await fetch('trips/' + fiche.fichier)).json();
    const photos = voyage.lieux.filter((l) => l.photo).map((l) => `images/${voyage.id}/${l.id}.jpg`);
    await Promise.all(photos.map((url) => cache.add(url).catch(() => null)));
  }
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(toutMettreEnCache().then(() => self.skipWaiting()));
});

// Activation : on supprime les caches des anciennes versions.
self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);
  // On ne gère que nos propres fichiers. Le taux de change (autre site) passe en direct.
  if (requete.method !== 'GET' || url.origin !== self.location.origin) return;

  evenement.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(requete, { ignoreSearch: true });
      const reseau = fetch(requete)
        .then((reponse) => {
          if (reponse.ok) cache.put(requete, reponse.clone());
          return reponse;
        })
        .catch(() => null);

      if (enCache) {
        evenement.waitUntil(reseau); // laisse la mise à jour se terminer en arrière-plan
        return enCache;
      }
      const reponse = await reseau;
      if (reponse) return reponse;
      // Hors ligne et rien en cache : on renvoie la page de l'appli si c'est une navigation.
      if (requete.mode === 'navigate') return cache.match('index.html');
      return new Response('Hors ligne', { status: 503, statusText: 'Hors ligne' });
    })
  );
});
