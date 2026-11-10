// Rappels dans le calendrier du téléphone.
//
// Une appli web sans serveur ne peut pas envoyer de notification toute seule
// quand elle est fermée. La solution fiable : fabriquer un fichier calendrier
// (.ics, format lu par iPhone, Android, Google Agenda, Outlook). Chaque rappel
// devient un événement d'une journée avec une alarme à 9 h, et c'est l'appli
// Calendrier du téléphone qui te notifie.

import { dateISO, lireDate } from './util.js';

// Le format .ics demande d'échapper quelques caractères dans les textes.
const propre = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const compact = (iso) => iso.replace(/-/g, ''); // "2027-01-08" -> "20270108"

function lendemain(iso) {
  const d = lireDate(iso);
  d.setDate(d.getDate() + 1);
  return compact(dateISO(d));
}

export function fichierCalendrier(voyage, rappels) {
  const tampon = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const evenements = rappels.map((r) => [
    'BEGIN:VEVENT',
    // Identifiant stable : réimporter le fichier met à jour au lieu de créer des doublons.
    `UID:${voyage.id}-${r.id}@carnets`,
    `DTSTAMP:${tampon}`,
    `DTSTART;VALUE=DATE:${compact(r.echeance)}`,
    `DTEND;VALUE=DATE:${lendemain(r.echeance)}`,
    `SUMMARY:${propre(voyage.nom + ' : ' + r.texte)}`,
    `DESCRIPTION:${propre(r.note || 'Rappel du carnet ' + voyage.nom)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${propre(r.texte)}`,
    'TRIGGER:PT9H', // 9 heures après le début de la journée = 9 h du matin
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n'));

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Carnets//FR', 'CALSCALE:GREGORIAN', ...evenements, 'END:VCALENDAR'].join('\r\n');
}

export function ouvrirCalendrier(voyage, rappels) {
  const blob = new Blob([fichierCalendrier(voyage, rappels)], { type: 'text/calendar' });
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  // Sur iPhone, ouvrir le fichier propose directement "Ajouter au calendrier".
  // Ailleurs on le télécharge, et un double-clic l'importe.
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) lien.download = `rappels-${voyage.id}.ics`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 30000);
}
