import type { EintrittArt, SortMode, Typ } from '../types';

export const TYP_LABEL: Record<Typ, string> = {
  klassiker: 'Großer Klassiker',
  kunst: 'Kunsthandwerk & Design',
  kiez: 'Kiez & Basar',
  historisch: 'Historisch & Märchen',
  international: 'International',
  natur: 'Land, Wald & Öko',
  rummel: 'Rummel & Erlebnis',
  szene: 'Themen & Szene',
};

export const TYP_ORDER: Typ[] = [
  'klassiker',
  'kunst',
  'kiez',
  'historisch',
  'international',
  'natur',
  'rummel',
  'szene',
];

export const EINTRITT_LABEL: Record<EintrittArt, string> = {
  frei: 'Eintritt frei',
  spende: 'Eintritt auf Spende',
  kosten: 'Eintritt kostet',
  ticket: 'Nur mit Ticket',
  unbekannt: 'Eintritt: keine Angabe',
};

export const SORT_LABEL: Record<SortMode, string> = {
  status: 'Geöffnet zuerst',
  start: 'Nächster Termin',
  name: 'A bis Z',
  distanz: 'Entfernung',
};
