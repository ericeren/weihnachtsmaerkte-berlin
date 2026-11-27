import type { Interval, Market, Moment } from '../types';

/** Wenn ein Markt kein Ende angibt, rechnen wir für Filter mit 22 Uhr. */
export const UNKNOWN_END = 22 * 60;

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

function utc(iso: string): number {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toISO(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(iso: string, n: number): string {
  return toISO(utc(iso) + n * 86400000);
}

/** 0 = Montag bis 6 = Sonntag */
export function weekdayOf(iso: string): number {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86400000);
}

let formatter: Intl.DateTimeFormat | null | undefined;
function berlinFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) return formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    // Probelauf, manche Umgebungen kennen formatToParts nicht
    formatter.formatToParts(new Date());
  } catch {
    formatter = null;
  }
  return formatter;
}

/**
 * Datum und Uhrzeit für das Auswahlrad. Das Rad zeigt die Uhrzeit des Geräts,
 * auf einem Gerät in Berlin ist das die Berliner Zeit.
 */
export function momentToDate(date: string, minutes: number): Date {
  const [y, m, d] = parts(date);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

export function dateToMoment(dt: Date): Moment {
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    minutes: dt.getHours() * 60 + dt.getMinutes(),
  };
}

/** Aktuelle Zeit in Berlin, unabhängig von der Zeitzone des Geräts. */
export function berlinNow(date: Date = new Date()): Moment {
  const f = berlinFormatter();
  if (f) {
    try {
      const p: Record<string, string> = {};
      for (const x of f.formatToParts(date)) p[x.type] = x.value;
      const hour = Number(p.hour) % 24;
      return {
        date: `${p.year}-${p.month}-${p.day}`,
        minutes: hour * 60 + Number(p.minute),
      };
    } catch {
      // weiter mit Gerätezeit
    }
  }
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    minutes: date.getHours() * 60 + date.getMinutes(),
  };
}

export function endOf(iv: Interval): number {
  return iv[1] ?? Math.max(UNKNOWN_END, iv[0] + 120);
}

/** Öffnungszeit an einem Tag oder null, wenn geschlossen. */
export function intervalOn(m: Market, date: string): Interval | null {
  if (date < m.von || date > m.bis) return null;
  if (m.zu.includes(date)) return null;
  const special = m.sonder[date];
  if (special) return special;
  return m.woche[weekdayOf(date)] ?? null;
}

export function isOpenAt(m: Market, date: string, minutes: number): boolean {
  const iv = intervalOn(m, date);
  if (iv && minutes >= iv[0] && minutes < endOf(iv)) return true;
  // Öffnungszeit vom Vortag, die über Mitternacht geht (z. B. Silvester)
  const prev = intervalOn(m, addDays(date, -1));
  return !!prev && endOf(prev) > 1440 && minutes < endOf(prev) - 1440;
}

export interface Opening {
  date: string;
  iv: Interval;
}

/** Nächste Öffnung ab einem Zeitpunkt (inklusive einer gerade laufenden). */
export function nextOpening(m: Market, from: Moment): Opening | null {
  let d = from.date < m.von ? m.von : from.date;
  for (let k = 0; k < 400 && d <= m.bis; k++) {
    const iv = intervalOn(m, d);
    if (iv && (d !== from.date || endOf(iv) > from.minutes)) return { date: d, iv };
    d = addDays(d, 1);
  }
  return null;
}

/** Alle Öffnungstage ab einem Datum, höchstens limit Stück. */
export function openingDays(m: Market, fromDate: string, limit = 60): Opening[] {
  const out: Opening[] = [];
  let d = fromDate < m.von ? m.von : fromDate;
  for (let k = 0; k < 400 && d <= m.bis && out.length < limit; k++) {
    const iv = intervalOn(m, d);
    if (iv) out.push({ date: d, iv });
    d = addDays(d, 1);
  }
  return out;
}

export function isEnded(m: Market, now: Moment): boolean {
  return !isOpenAt(m, now.date, now.minutes) && nextOpening(m, now) === null;
}

/** Samstag und Sonntag des laufenden oder kommenden Wochenendes. */
export function weekendDates(today: string): string[] {
  const wd = weekdayOf(today);
  if (wd === 6) return [today];
  if (wd === 5) return [today, addDays(today, 1)];
  return [addDays(today, 5 - wd), addDays(today, 6 - wd)];
}

export type StatusTone = 'open' | 'soon' | 'later' | 'ended';
