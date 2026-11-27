import type { Filters, LatLng, Market, Moment } from '../types';
import { distanceKm } from './geo';
import { TYP_LABEL } from './labels';
import { endOf, intervalOn, isEnded, isOpenAt, nextOpening, weekendDates } from './time';

export const DEFAULT_FILTERS: Filters = {
  when: { kind: 'alle' },
  time: null,
  typen: [],
  bezirke: [],
  frei: false,
  barrierefrei: false,
  radiusKm: null,
  sort: 'status',
  query: '',
};

/** Tage, die der Zeitfilter betrachtet (leer = egal) */
export function filterDates(f: Filters, now: Moment): string[] {
  if (f.when.kind === 'tag') return [f.when.date];
  if (f.when.kind === 'wochenende') return weekendDates(now.date);
  return [];
}

function matchesWhen(m: Market, f: Filters, now: Moment): boolean {
  if (f.when.kind === 'alle') return true;
  if (f.when.kind === 'jetzt') return isOpenAt(m, now.date, now.minutes);
  return filterDates(f, now).some((d) => {
    if (f.time === null) {
      const iv = intervalOn(m, d);
      // heute: nur, wenn noch nicht vorbei
      return !!iv && (d !== now.date || endOf(iv) > now.minutes);
    }
    return isOpenAt(m, d, f.time);
  });
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[’'`]/g, '')
    .trim();
}

/** Zahl aktiver Filter ohne die Schnellfilter Zeitpunkt, Eintritt und Nähe */
export function extraFilterCount(f: Filters): number {
  return f.typen.length + f.bezirke.length + (f.barrierefrei ? 1 : 0);
}

export function isDefault(f: Filters): boolean {
  return (
    f.when.kind === 'alle' &&
    f.time === null &&
    f.typen.length === 0 &&
    f.bezirke.length === 0 &&
    !f.frei &&
    !f.barrierefrei &&
    f.radiusKm === null &&
    f.query.trim() === ''
  );
}

export interface FilterResult {
  list: Market[];
  distances: Record<string, number>;
  openNow: number;
}

/** Rang für "Geöffnet zuerst": jetzt offen, heute noch, später */
function statusRank(m: Market, now: Moment): [number, string, number] {
  if (isOpenAt(m, now.date, now.minutes)) return [0, now.date, 0];
  const n = nextOpening(m, now);
  if (!n) return [3, '9999', 0];
  return [n.date === now.date ? 1 : 2, n.date, n.iv[0]];
}

export function applyFilters(
  markets: Market[],
  f: Filters,
  now: Moment,
  pos: LatLng | null,
): FilterResult {
  const q = normalize(f.query);
  const distances: Record<string, number> = {};
  if (pos) for (const m of markets) distances[m.id] = distanceKm(pos, m.lat, m.lng);

  const list = markets.filter((m) => {
    // Beendete Märkte fallen raus, außer bei einem gewählten Tag, etwa beim Rückblick nach der Saison
    if (f.when.kind !== 'tag' && isEnded(m, now)) return false;
    if (!matchesWhen(m, f, now)) return false;
    if (f.typen.length && !f.typen.includes(m.typ)) return false;
    if (f.bezirke.length && !f.bezirke.includes(m.bezirk)) return false;
    if (f.frei && m.eintritt.art !== 'frei' && m.eintritt.art !== 'spende') return false;
    if (f.barrierefrei && !m.barrierefrei) return false;
    if (f.radiusKm !== null && pos && distances[m.id] > f.radiusKm) return false;
    if (q) {
      const hay = normalize(`${m.name} ${m.adresse} ${m.bezirk} ${TYP_LABEL[m.typ]} ${m.text}`);
      if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  const byName = (a: Market, b: Market) => a.name.localeCompare(b.name, 'de');
  const sort = f.sort === 'distanz' && !pos ? 'status' : f.sort;
  if (sort === 'name') list.sort(byName);
  else if (sort === 'distanz') list.sort((a, b) => distances[a.id] - distances[b.id]);
  else {
    const rank = new Map(list.map((m) => [m.id, statusRank(m, now)]));
    list.sort((a, b) => {
      const ra = rank.get(a.id)!;
      const rb = rank.get(b.id)!;
      if (sort === 'status' && ra[0] !== rb[0]) return ra[0] - rb[0];
      if (ra[1] !== rb[1]) return ra[1] < rb[1] ? -1 : 1;
      if (ra[2] !== rb[2]) return ra[2] - rb[2];
      return byName(a, b);
    });
  }

  const openNow = list.filter((m) => isOpenAt(m, now.date, now.minutes)).length;
  return { list, distances, openNow };
}
