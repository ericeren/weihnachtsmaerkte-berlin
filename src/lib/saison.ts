import { MARKETS } from '../data';
import { addDays, isOpenAt } from './time';

/** Erster und letzter Markttag der Saison laut Daten */
export const ERSTER_TAG = MARKETS.reduce((a, m) => (m.von < a ? m.von : a), '9999-12-31');
export const LETZTER_TAG = MARKETS.reduce((a, m) => (m.bis > a ? m.bis : a), '0000-00-00');

function offenUm(date: string, minutes: number): number {
  return MARKETS.filter((m) => isOpenAt(m, date, minutes)).length;
}

/**
 * Der Zeitpunkt mit den meisten gleichzeitig offenen Märkten, geprüft zu jeder vollen Stunde
 * von 11 bis 21 Uhr. Bei Gleichstand gilt der frühere.
 */
export const BESTER_MOMENT: { date: string; minutes: number; offen: number } = (() => {
  let best = { date: ERSTER_TAG, minutes: 16 * 60, offen: -1 };
  for (let d = ERSTER_TAG; d <= LETZTER_TAG; d = addDays(d, 1)) {
    for (let h = 11; h <= 21; h++) {
      const offen = offenUm(d, h * 60);
      if (offen > best.offen) best = { date: d, minutes: h * 60, offen };
    }
  }
  return best;
})();

/**
 * Letzter Tag der Hauptsaison: der letzte Tag, an dem zur Uhrzeit des besten Moments noch mindestens
 * ein Viertel so viele Märkte offen hatten. Danach zeigt die Übersicht den Hinweis auf den Rückblick.
 */
export const HAUPTSAISON_ENDE = (() => {
  let ende = ERSTER_TAG;
  for (let d = ERSTER_TAG; d <= LETZTER_TAG; d = addDays(d, 1)) {
    if (offenUm(d, BESTER_MOMENT.minutes) >= BESTER_MOMENT.offen / 4) ende = d;
  }
  return ende;
})();
