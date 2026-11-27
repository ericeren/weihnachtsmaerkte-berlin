import raw from './markets.json';
import type { BildInfo, Market } from '../types';

export { IMAGES } from './images';

const data = raw as unknown as {
  stand: string;
  bilder: Record<string, BildInfo>;
  maerkte: Market[];
};

/** Datenstand als ISO-Datum */
export const STAND = data.stand;
export const MARKETS: Market[] = data.maerkte;
export const BILDER: Record<string, BildInfo> = data.bilder;
export const BY_ID: Record<string, Market> = Object.fromEntries(MARKETS.map((m) => [m.id, m]));
export const BEZIRKE: string[] = Array.from(new Set(MARKETS.map((m) => m.bezirk))).sort((a, b) =>
  a.localeCompare(b, 'de'),
);
