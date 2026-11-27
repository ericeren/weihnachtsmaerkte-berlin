import type { Filters, Interval, Market, Moment } from '../types';
import {
  addDays,
  endOf,
  intervalOn,
  isOpenAt,
  nextOpening,
  openingDays,
  weekdayOf,
  type Opening,
  type StatusTone,
} from './time';

export const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function ymd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

/** 660 -> "11", 690 -> "11:30", 1620 -> "3" */
export function clock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}:${r < 10 ? '0' : ''}${r}` : `${h}`;
}

export function hoursText(iv: Interval): string {
  if (iv[1] === null) return `ab ${clock(iv[0])} Uhr`;
  return `${clock(iv[0])} bis ${clock(iv[1])} Uhr`;
}

/** "Sa 5.12." */
export function dateShort(iso: string): string {
  const [, m, d] = ymd(iso);
  return `${WD[weekdayOf(iso)]} ${d}.${m}.`;
}

/** "5.12.2026" */
export function dateNum(iso: string): string {
  const [y, m, d] = ymd(iso);
  return `${d}.${m}.${y}`;
}

/** "Samstag, 5. Dezember" */
export function dateLong(iso: string, withYear = false): string {
  const [y, m, d] = ymd(iso);
  return `${WD_LONG[weekdayOf(iso)]}, ${d}. ${MONATE[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** Relativer Tagesname: "Heute", "Morgen" oder "Sa 5.12." */
export function dayName(iso: string, today: string): string {
  if (iso === today) return 'Heute';
  if (iso === addDays(today, 1)) return 'Morgen';
  return dateShort(iso);
}

/** Gewählter Zeitpunkt: "Heute, 18:30 Uhr" oder "Sa 5.12., ganzer Tag" */
export function momentText(date: string, time: number | null, today: string): string {
  return `${dayName(date, today)}, ${time === null ? 'ganzer Tag' : `${clock(time)} Uhr`}`;
}

export function seasonText(m: Market): string {
  if (m.von === m.bis) return `${WD_LONG[weekdayOf(m.von)]}, ${dateNum(m.von)}`;
  const [y1, m1, d1] = ymd(m.von);
  const [y2] = ymd(m.bis);
  if (y1 === y2) return `${d1}.${m1}. bis ${dateNum(m.bis)}`;
  return `${dateNum(m.von)} bis ${dateNum(m.bis)}`;
}

function sameIv(a: Interval | null, b: Interval | null): boolean {
  if (!a || !b) return a === b;
  return a[0] === b[0] && a[1] === b[1];
}

/** Wochenplan in Gruppen: [["Mo bis Do", "11 bis 22 Uhr"], ...] */
export function weeklyRows(m: Market): [string, string][] {
  const rows: [string, string][] = [];
  let i = 0;
  while (i < 7) {
    const iv = m.woche[i];
    if (!iv) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < 7 && sameIv(m.woche[j + 1], iv)) j++;
    const label = i === j ? WD[i] : j === i + 1 ? `${WD[i]} und ${WD[j]}` : `${WD[i]} bis ${WD[j]}`;
    rows.push([label, hoursText(iv)]);
    i = j + 1;
  }
  return rows;
}

/** Kurzform für Vorschau: "Mo bis Do 11 bis 22 Uhr, Fr und Sa 11 bis 23 Uhr" */
export function weeklyText(m: Market): string {
  return weeklyRows(m)
    .map(([d, h]) => `${d} ${h}`)
    .join(', ');
}

/** Märkte mit wenigen Terminen zeigen wir als Liste von Tagen statt als Wochenplan. */
export function isShortRun(m: Market): boolean {
  return openingDays(m, m.von, 6).length <= 5;
}

function joinDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

/** Termine kompakt: kurze Märkte mit Datum, lange mit Wochenplan */
export function scheduleText(m: Market, today: string): string {
  if (isShortRun(m)) {
    const days = openingDays(m, today, 8);
    if (!days.length) return 'Keine weiteren Termine';
    const groups: { dates: string[]; iv: Interval }[] = [];
    for (const d of days) {
      const g = groups.find((x) => sameIv(x.iv, d.iv));
      if (g) g.dates.push(d.date);
      else groups.push({ dates: [d.date], iv: d.iv });
    }
    return groups.map((g) => `${joinDe(g.dates.map(dateShort))}: ${hoursText(g.iv)}`).join('; ');
  }
  const weekly = weeklyText(m);
  const range = m.von > today ? seasonText(m) : `Bis ${dateNum(m.bis)}`;
  return weekly ? `${range}: ${weekly}` : range;
}

export interface StatusInfo {
  tone: StatusTone;
  label: string;
}

/** Status relativ zu jetzt */
export function statusNow(m: Market, now: Moment): StatusInfo {
  if (isOpenAt(m, now.date, now.minutes)) {
    const iv = intervalOn(m, now.date);
    const running = iv && now.minutes >= iv[0] ? iv : intervalOn(m, addDays(now.date, -1));
    if (running && running[1] === null) return { tone: 'open', label: `Jetzt geöffnet, seit ${clock(running[0])} Uhr` };
    if (running) return { tone: 'open', label: `Jetzt geöffnet bis ${clock(endOf(running))} Uhr` };
    return { tone: 'open', label: 'Jetzt geöffnet' };
  }
  const next = nextOpening(m, now);
  if (!next) return { tone: 'ended', label: 'In dieser Saison beendet' };
  const when = dayName(next.date, now.date);
  if (next.date === now.date) return { tone: 'soon', label: `${when} ${hoursText(next.iv)}` };
  return { tone: 'later', label: `${when}, ${hoursText(next.iv)}` };
}

/** Text für einen bestimmten Tag, z. B. bei Datumsfilter */
export function hoursOn(m: Market, date: string, today: string): string {
  const iv = intervalOn(m, date);
  const day = dayName(date, today);
  return iv ? `${day}: ${hoursText(iv)}` : `${day}: geschlossen`;
}

export function openingLine(o: Opening, today: string): string {
  return `${dayName(o.date, today)}, ${hoursText(o.iv)}`;
}

export function distanceText(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Legt der Filter einen Zeitpunkt oder einen anderen Tag fest, hat jeder angezeigte Markt dann offen.
 * Die Karte zeigt dann alle Sterne rot mit dieser einen Legendenzeile, auch beim Rückblick nach der Saison.
 * Sonst null, dann zählt jetzt.
 */
export function fixedLegend(f: Filters, now: Moment): string | null {
  if (f.when.kind !== 'tag') return null;
  if (f.time !== null) return `Offen um ${clock(f.time)} Uhr`;
  return f.when.date === now.date ? null : 'An dem Tag offen';
}
