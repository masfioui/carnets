// Petits effets "plaisir" : la vibration et la pluie de confettis.
// Rien ici n'est indispensable : si un effet ne marche pas sur un téléphone,
// l'appli continue normalement (d'où les try/catch).

// Petite vibration sous le doigt, sur Android seulement (navigator.vibrate).
// Safari sur iPhone ne connaît pas cette fonction : là-bas, la vibration des cases
// vient de l'interrupteur natif caché dans chaque case (voir coche() dans util.js).
export function vibrer(duree = 12) {
  try {
    navigator.vibrate?.(duree);
  } catch {
    // Pas de vibration possible : tant pis.
  }
}

// Pluie de confettis dorés pendant 1,6 s (journée entièrement cochée).
// Chaque confetti est un petit <i> ; sa trajectoire est tirée au hasard et
// passée au CSS par des variables (--x, --y, --r), voir "Confettis" dans style.css.
const TEINTES = ['var(--accent)', '#f6d29a', '#ffffff', '#c4853a'];
export function feter() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('.fete')?.remove();
  const zone = document.createElement('div');
  zone.className = 'fete';
  zone.setAttribute('aria-hidden', 'true');
  for (let n = 0; n < 36; n++) {
    const confetti = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 170;
    confetti.style.setProperty('--x', Math.round(Math.cos(angle) * distance) + 'px');
    confetti.style.setProperty('--y', Math.round(Math.sin(angle) * distance - 60) + 'px');
    confetti.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
    confetti.style.background = TEINTES[n % TEINTES.length];
    confetti.style.animationDelay = Math.round(Math.random() * 120) + 'ms';
    zone.appendChild(confetti);
  }
  document.body.appendChild(zone);
  setTimeout(() => zone.remove(), 1800);
}
