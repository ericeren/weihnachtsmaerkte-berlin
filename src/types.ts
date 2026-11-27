/** Öffnungszeit in Minuten ab Mitternacht. Ende null = nicht angegeben, Ende > 1440 = nach Mitternacht. */
export type Interval = [number, number | null];

export type Typ =
  | 'klassiker'
  | 'kiez'
  | 'kunst'
  | 'historisch'
  | 'international'
  | 'natur'
  | 'rummel'
  | 'szene';

export type EintrittArt = 'frei' | 'kosten' | 'spende' | 'ticket' | 'unbekannt';

export interface Market {
  id: string;
  name: string;
  typ: Typ;
  bezirk: string;
  adresse: string;
  lat: number;
  lng: number;
  /** ISO-Datum YYYY-MM-DD */
  von: string;
  bis: string;
  /** Index 0 = Montag bis 6 = Sonntag, null = an diesem Wochentag geschlossen */
  woche: (Interval | null)[];
  /** zusätzlich geschlossene Tage */
  zu: string[];
  /** abweichende Zeiten an einzelnen Tagen (gilt auch, wenn der Wochentag sonst zu ist) */
  sonder: Record<string, Interval>;
  eintritt: { art: EintrittArt; text: string };
  text: string;
  web?: { url: string; art: 'veranstalter' | 'info' };
  oepnv?: string;
  barrierefrei?: boolean;
  bild?: string;
  hinweis?: string;
}

export interface BildInfo {
  urheber: string;
  lizenz: string;
  lizenzUrl: string;
}

/** Zeitpunkt in Berliner Zeit */
export interface Moment {
  date: string;
  minutes: number;
}

export type When =
  | { kind: 'alle' }
  | { kind: 'jetzt' }
  | { kind: 'tag'; date: string }
  | { kind: 'wochenende' };

export type SortMode = 'status' | 'name' | 'distanz' | 'start';

export interface Filters {
  when: When;
  /** Minuten, nur bei Tag oder Wochenende */
  time: number | null;
  typen: Typ[];
  bezirke: string[];
  frei: boolean;
  barrierefrei: boolean;
  radiusKm: number | null;
  sort: SortMode;
  query: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}
