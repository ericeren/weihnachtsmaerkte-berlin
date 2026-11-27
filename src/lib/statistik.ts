import { MARKETS } from '../data';
import type { Market } from '../types';
import { TYP_LABEL } from './labels';
import { BESTER_MOMENT, ERSTER_TAG, LETZTER_TAG } from './saison';
import { addDays, intervalOn, isOpenAt, weekdayOf } from './time';

export interface Zeile {
  label: string;
  wert: number;
}

export interface TagWert {
  date: string;
  /** Märkte, die an diesem Tag irgendwann offen haben */
  offen: number;
  wochenende: boolean;
}

export interface StundenWert {
  stunde: number;
  /** Schnitt der offenen Märkte zur vollen Stunde, Samstag und Sonntag im Advent */
  wochenende: number;
  /** Schnitt der offenen Märkte zur vollen Stunde, Montag bis Freitag im Advent */
  werktag: number;
}

export interface Statistik {
  maerkte: number;
  /** Eintritt frei oder auf Spende */
  ohneEintritt: number;
  nurEinTag: number;
  /** Hälfte der Märkte hat höchstens so viele Öffnungstage */
  medianTage: number;
  /** Märkte mit mehr als 30 Öffnungstagen */
  langlaeufer: number;
  bester: { date: string; minutes: number; offen: number };
  /** Kernzeit der Saison, ganze Wochen von Montag bis Sonntag */
  tage: TagWert[];
  tagMax: TagWert;
  /** höchster Wert an den Tagen der Saison außerhalb der Kernzeit */
  ausserhalbMax: number;
  advent: { von: string; bis: string; wochenende: number; werktag: number };
  heiligabend: { date: string; offen: number };
  stunden: StundenWert[];
  laufzeit: Zeile[];
  bezirke: Zeile[];
  arten: Zeile[];
  barrierefrei: number;
}

const istWochenende = (date: string) => weekdayOf(date) >= 5;

function oeffnungstage(m: Market): number {
  let n = 0;
  for (let d = m.von; d <= m.bis; d = addDays(d, 1)) if (intervalOn(m, d)) n++;
  return n;
}

function zaehle(werte: string[]): Zeile[] {
  const z = new Map<string, number>();
  for (const w of werte) z.set(w, (z.get(w) ?? 0) + 1);
  return [...z.entries()]
    .map(([label, wert]) => ({ label, wert }))
    .sort((a, b) => b.wert - a.wert || a.label.localeCompare(b.label, 'de'));
}

/** Vierter Advent ist der letzte Sonntag vor dem 25. Dezember, der erste liegt drei Wochen davor. */
export function adventszeit(jahr: string): { von: string; bis: string } {
  let vierter = `${jahr}-12-24`;
  while (weekdayOf(vierter) !== 6) vierter = addDays(vierter, -1);
  const erster = addDays(vierter, -21);
  // ab dem Samstag vor dem ersten Advent, an dem die meisten Märkte öffnen
  return { von: addDays(erster, -1), bis: vierter };
}

export function berechneStatistik(markets: Market[] = MARKETS): Statistik {
  const alleTage: TagWert[] = [];
  for (let d = ERSTER_TAG; d <= LETZTER_TAG; d = addDays(d, 1)) {
    alleTage.push({ date: d, offen: markets.filter((m) => intervalOn(m, d)).length, wochenende: istWochenende(d) });
  }
  const tagMax = alleTage.reduce((a, t) => (t.offen > a.offen ? t : a), alleTage[0]);

  // Kernzeit: vom ersten bis zum letzten Tag mit mindestens einem Zehntel des Spitzenwerts, auf ganze Wochen erweitert
  const schwelle = Math.ceil(tagMax.offen / 10);
  const mitBetrieb = alleTage.filter((t) => t.offen >= schwelle);
  let von = mitBetrieb[0].date;
  let bis = mitBetrieb[mitBetrieb.length - 1].date;
  while (weekdayOf(von) !== 0 && von > ERSTER_TAG) von = addDays(von, -1);
  while (weekdayOf(bis) !== 6 && bis < LETZTER_TAG) bis = addDays(bis, 1);
  const tage = alleTage.filter((t) => t.date >= von && t.date <= bis);
  const ausserhalbMax = Math.max(0, ...alleTage.filter((t) => t.date < von || t.date > bis).map((t) => t.offen));

  const jahr = ERSTER_TAG.slice(0, 4);
  const adv = adventszeit(jahr);
  const advTage = alleTage.filter((t) => t.date >= adv.von && t.date <= adv.bis);
  const schnitt = (ts: TagWert[]) => ts.reduce((a, t) => a + t.offen, 0) / Math.max(1, ts.length);
  const advWe = advTage.filter((t) => t.wochenende);
  const advWt = advTage.filter((t) => !t.wochenende);

  const stunden: StundenWert[] = [];
  for (let h = 10; h <= 22; h++) {
    const offenUm = (ts: TagWert[]) =>
      ts.reduce((a, t) => a + markets.filter((m) => isOpenAt(m, t.date, h * 60)).length, 0) / Math.max(1, ts.length);
    stunden.push({ stunde: h, wochenende: offenUm(advWe), werktag: offenUm(advWt) });
  }

  const tageJeMarkt = markets.map(oeffnungstage);
  const sortiert = [...tageJeMarkt].sort((a, b) => a - b);
  const klasse = (a: number, b: number) => tageJeMarkt.filter((n) => n >= a && n <= b).length;
  const heilig = `${jahr}-12-24`;

  return {
    maerkte: markets.length,
    ohneEintritt: markets.filter((m) => m.eintritt.art === 'frei' || m.eintritt.art === 'spende').length,
    nurEinTag: klasse(1, 1),
    medianTage: sortiert[Math.floor((sortiert.length - 1) / 2)],
    langlaeufer: klasse(31, Infinity),
    bester: BESTER_MOMENT,
    tage,
    tagMax,
    ausserhalbMax,
    advent: { ...adv, wochenende: schnitt(advWe), werktag: schnitt(advWt) },
    heiligabend: { date: heilig, offen: alleTage.find((t) => t.date === heilig)?.offen ?? 0 },
    stunden,
    laufzeit: [
      { label: '1 Tag', wert: klasse(1, 1) },
      { label: '2 bis 3 Tage', wert: klasse(2, 3) },
      { label: '4 bis 10 Tage', wert: klasse(4, 10) },
      { label: '11 bis 30 Tage', wert: klasse(11, 30) },
      { label: 'über 30 Tage', wert: klasse(31, Infinity) },
    ],
    bezirke: zaehle(markets.map((m) => m.bezirk)),
    arten: zaehle(markets.map((m) => TYP_LABEL[m.typ])),
    barrierefrei: markets.filter((m) => m.barrierefrei === true).length,
  };
}

let cache: Statistik | null = null;

/** Wird erst beim Öffnen der Seite berechnet, nicht beim Start der App. */
export function statistik(): Statistik {
  if (!cache) cache = berechneStatistik();
  return cache;
}
