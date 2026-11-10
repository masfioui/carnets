// Petits effets "plaisir" : la vibration et la pluie de confettis.
// Rien ici n'est indispensable : si un effet ne marche pas sur un téléphone,
// l'appli continue normalement (d'où les try/catch).

// Petite vibration sous le doigt.
// - Android : navigator.vibrate existe, on l'utilise.
// - iPhone : Safari ne connaît pas navigator.vibrate. Astuce connue : depuis iOS 18,
//   basculer un interrupteur (<input type="checkbox" switch>) déclenche un léger
//   retour haptique. On en crée un invisible, on le bascule, on le retire.
//   Sur un iPhone plus ancien il ne se passe simplement rien.
export function vibrer(duree = 12) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(duree);
      return;
    }
    const etiquette = document.createElement('label');
    etiquette.style.display = 'none';
    etiquette.setAttribute('aria-hidden', 'true');
    const interrupteur = document.createElement('input');
    interrupteur.type = 'checkbox';
    interrupteur.setAttribute('switch', '');
    etiquette.appendChild(interrupteur);
    document.head.appendChild(etiquette);
    etiquette.click();
    etiquette.remove();
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
