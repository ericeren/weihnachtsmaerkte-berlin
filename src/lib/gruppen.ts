/**
 * Zahlenblasen für die Karte: Märkte, deren Sterne sich auf dem Bildschirm berühren, werden zu
 * einer Blase zusammengefasst. Was sich nicht berührt, bleibt einzeln. Maßgeblich ist die
 * quadratische Tippfläche um jeden Stern. Überlappen zwei Tippflächen nicht, trifft jeder Tipp
 * den richtigen Stern, und jedes Tippziel ist mindestens 24 Punkte groß, wie es WCAG 2.2 verlangt. Dieselbe Rechnung gilt für
 * die Webseite (Leaflet) und das iPhone (Apple Karten), damit beide gleich gruppieren.
 *
 * Gerechnet wird in Bildschirmpunkten der Web-Mercator-Projektion mit 256 Punkte großen Kacheln.
 * Das ist die Zoomstufe, die Leaflet anzeigt, und die, die sich aus dem Kartenausschnitt auf dem
 * iPhone ergibt.
 */

import type { StatusTone } from './time';

export interface Punkt {
  id: string;
  lat: number;
  lng: number;
  /** Halbe Kantenlänge der Tippfläche in Punkten, ohne Angabe die eines großen Sterns */
  r?: number;
}

export interface Gruppe {
  /** Märkte der Gruppe, bei einem einzelnen Markt genau einer */
  ids: string[];
  /** Mitte der Gruppe, bei einem einzelnen Markt seine Lage */
  lat: number;
  lng: number;
}

/** Halbe Tippfläche eines großen Sterns (28 Punkte) */
export const STERN_RADIUS = 14;

/**
 * Halbe Tippfläche eines Sterns: 28 Punkte groß, an anderen Tagen 22. Kleine Sterne liegen in
 * einer Tippfläche von 24 Punkten, dem Mindestmaß für Tippziele nach WCAG 2.2.
 */
export function sternRadius(klein: boolean): number {
  return klein ? 12 : STERN_RADIUS;
}

/** Halbe Tippfläche einer Blase: 34 Punkte bis 9 Märkte, ab 10 Märkten 38 Punkte */
export function blasenRadius(anzahl: number): number {
  return anzahl >= 10 ? 19 : 17;
}

/** Ab dieser Zoomstufe zeigt die Karte jeden Markt einzeln, Straßen sind dann gut lesbar */
export const GRUPPEN_BIS_ZOOM = 15;

/** Bis zu dieser Zoomstufe vergrößert ein Tipp auf eine Blase höchstens */
export const BLASE_MAX_ZOOM = 16;

/** Lage in Bildschirmpunkten bei Zoomstufe z */
export function weltpunkt(lat: number, lng: number, z: number): [number, number] {
  const s = 256 * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
}

/** Zoomstufe aus dem Kartenausschnitt: so viele Längengrade passen auf so viele Punkte Breite */
export function zoomAusBreite(longitudeDelta: number, breitePunkte: number): number {
  return Math.log2((360 * breitePunkte) / (256 * longitudeDelta));
}

interface Knoten {
  ids: string[];
  lat: number;
  lng: number;
  x: number;
  y: number;
  r: number;
}

/**
 * Fasst Märkte zusammen, deren Tippflächen sich berühren. Eine neue Blase kann ihrerseits andere
 * Sterne oder Blasen berühren, dann wächst sie weiter, bis sich nichts mehr berührt. Zuerst
 * verschmelzen die beiden, die sich am stärksten überdecken. Als Berührung gilt schon ein Abstand
 * von unter einem Punkt. Die Eingabe wird nach Nummer sortiert, so ist das Ergebnis immer gleich.
 */
export function gruppieren(punkte: Punkt[], z: number): Gruppe[] {
  if (z >= GRUPPEN_BIS_ZOOM || punkte.length < 2) {
    return punkte.map((p) => ({ ids: [p.id], lat: p.lat, lng: p.lng }));
  }
  const reihe = [...punkte].sort((a, b) => Number(a.id) - Number(b.id) || (a.id < b.id ? -1 : 1));
  const knoten: Knoten[] = reihe.map((p) => {
    const [x, y] = weltpunkt(p.lat, p.lng, z);
    return { ids: [p.id], lat: p.lat, lng: p.lng, x, y, r: p.r ?? STERN_RADIUS };
  });
  for (;;) {
    let staerkste = -1;
    let ia = -1;
    let ib = -1;
    for (let i = 0; i < knoten.length; i++) {
      for (let j = i + 1; j < knoten.length; j++) {
        const a = knoten[i];
        const b = knoten[j];
        // Zwei Quadrate überdecken sich, wenn sie es waagerecht und senkrecht tun
        const kante = a.r + b.r;
        const ueberdeckung = Math.min(kante - Math.abs(a.x - b.x), kante - Math.abs(a.y - b.y));
        if (ueberdeckung > staerkste) {
          staerkste = ueberdeckung;
          ia = i;
          ib = j;
        }
      }
    }
    if (ia < 0) break;
    const a = knoten[ia];
    const b = knoten[ib];
    const ids = [...a.ids, ...b.ids];
    const lat = (a.lat * a.ids.length + b.lat * b.ids.length) / ids.length;
    const lng = (a.lng * a.ids.length + b.lng * b.ids.length) / ids.length;
    const [x, y] = weltpunkt(lat, lng, z);
    knoten[ia] = { ids, lat, lng, x, y, r: blasenRadius(ids.length) };
    knoten.splice(ib, 1);
  }
  return knoten.map((k) => ({ ids: k.ids, lat: k.lat, lng: k.lng }));
}

/** Stand einer Blase, gezeigt wie bei den Sternen */
export type BlasenStand = 'offen' | 'heute' | 'zu';

/**
 * Eine Blase zeigt den besten Stand ihrer Märkte: grün gefüllt, wenn einer jetzt offen hat,
 * rot gefüllt, wenn sonst einer heute noch öffnet, grau gefüllt, wenn heute keiner mehr öffnet, wie die Sterne.
 */
export function blasenStand(
  ids: string[],
  tones: Record<string, StatusTone>,
): { stand: BlasenStand; offen: number; heute: number } {
  const offen = ids.filter((id) => tones[id] === 'open').length;
  const heute = ids.filter((id) => tones[id] === 'soon').length;
  return { stand: offen ? 'offen' : heute ? 'heute' : 'zu', offen, heute };
}

/** Text für Bildschirmleser, etwa „8 Märkte, davon 3 jetzt offen. Liste öffnen“ */
export function blasenText(anzahl: number, offen: number, fest: string | null, heute = 0): string {
  const stand = fest
    ? fest.charAt(0).toLowerCase() + fest.slice(1)
    : offen > 0
      ? `davon ${offen} jetzt offen`
      : heute > 0
        ? `keiner jetzt offen, ${heute === 1 ? '1 öffnet' : `${heute} öffnen`} heute noch`
        : 'keiner jetzt offen';
  return `${anzahl} Märkte, ${stand}. Liste öffnen`;
}
